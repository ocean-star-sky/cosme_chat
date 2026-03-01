import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { calcCompatibility, type SkinProfile } from "../../lib/compatibility";
import { readFileSync } from "fs";
import { join } from "path";

// ストリーミング最大60秒（n8nフル検索対応）
export const maxDuration = 60;

// n8n内部呼び出し（localhost直接）
async function callN8n(endpoint: string, body: object, timeoutMs = 30000): Promise<any> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(`http://localhost:5678/webhook/${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        return await res.json();
    } catch (e: any) {
        console.error(`n8n ${endpoint} error:`, e.message);
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// HTML属性エスケープ
function esc(s: string): string {
    return (s || "").replace(/"/g, "&quot;");
}

export async function POST(req: Request) {
    try {
        const { messages, skinProfile, currentProduct } = await req.json();
        const profile: SkinProfile | null = skinProfile || null;

        // 肌プロフィール情報をシステムプロンプトに注入
        let skinInfo = "未登録です。肌プロフィールの登録を自然に促してください。";
        if (profile?.skinType) {
            const typeLabels: Record<string, string> = { dry: "乾燥肌", oily: "脂性肌", combination: "混合肌", sensitive: "敏感肌", normal: "普通肌" };
            const concernLabels: Record<string, string> = { acne: "ニキビ", aging: "エイジング", darkSpots: "シミ・くすみ", dryness: "乾燥", redness: "赤み・敏感", pores: "毛穴", wrinkles: "シワ・たるみ" };
            skinInfo = `
- 肌タイプ: ${typeLabels[profile.skinType] || profile.skinType}
- 肌悩み: ${(profile.concerns || []).map(c => concernLabels[c] || c).join("、") || "未設定"}
- NG成分: ${(profile.ngIngredients || []).join("、") || "未設定"}
このプロフィールに基づいてパーソナライズされたアドバイスを提供してください。
NG成分を含む商品を勧める場合は必ず注意喚起してください。`;
        }

        let productContext = "";
        if (currentProduct?.name) {
            productContext = `
## 現在閲覧中の商品
商品名: ${currentProduct.name}
ブランド: ${currentProduct.brand || "不明"}
カテゴリ: ${currentProduct.category || "不明"}
この商品についての質問には、上記の情報も活用して回答してください。`;
        }

        const now = new Date();
        const month = now.toLocaleDateString("ja-JP", { month: "long" });

        const result = await streamText({
            model: openai("gpt-4o"),
            system: `あなたは「コスメコンシェルジュ」、化粧品・スキンケアの専門AIアシスタントです。
親しみやすく、でも専門知識のある美容アドバイザーとして振る舞ってください。

## 性格・話し方
- 親しみやすい敬語（「〜ですよ！」「〜がおすすめです！」）
- 美容の専門知識を分かりやすく解説
- 短めの返答を心がけ、長文を避ける（1回の返答は200文字程度＋カード）

## ツール利用の鉄則
- ユーザーに「検索しますか？」と聞かず、関連する話題が出たら自発的にツールを呼び出す
- 絶対に自作のHTMLタグを手動で書かない。必ずツールが返した文字列をそのまま出力する
- 1回の返答で複数ツールを呼んでOK

## 自然な提案の流れ（重要）
1. **商品名が出たら** → searchCosmeProductsで検索
2. **成分の話題** → analyzeSkinCompatibilityで分析
3. **「おすすめ」「何がいい？」** → 肌プロフィールベースでsearchCosmeProducts
4. **「値段」「安い」「最安値」** → comparePricesで価格比較
5. **「トレンド」「話題」「バズ」** → getTrendingProducts
6. **肌トラブル相談** → 肌悩みに合った成分・商品を提案

既に提案済みのカテゴリを同じ会話で繰り返さない。追加提案は1〜2種類まで。

## ユーザーの肌プロフィール
${skinInfo}
${productContext}

## 季節の活用（現在: ${month}）
春→花粉対策・UV、夏→日焼け止め・崩れ防止、秋→保湿切替、冬→高保湿・乾燥対策。

## 回答の構成
1. まず質問への直接回答を簡潔に（2〜3文）
2. ツールで取得したカード（そのまま出力）
3. 追加の一言提案（「〜もいかがですか？」で次の会話を促す）

## アフィリエイト表記
価格比較カードを表示する際は「※PR（価格比較にはアフィリエイトリンクを含みます）」と自然に触れる。`,
            messages,
            maxSteps: 5,
            tools: {
                // ツール1: 商品検索（高速版）
                searchCosmeProducts: tool({
                    description: "化粧品をキーワードで検索。商品名、ブランド名、カテゴリ（化粧水、乳液、ファンデーション等）で検索可能。",
                    parameters: z.object({
                        keyword: z.string().describe("検索キーワード（例: '無印良品 化粧水'、'セラミド 乳液'、'デパコス ファンデーション'）"),
                    }),
                    // @ts-ignore
                    execute: async ({ keyword }: { keyword: string }) => {
                        console.log(`[cosme-chat] searchCosmeProducts: ${keyword}`);
                        const data = await callN8n("cosme-product-basic", { keyword }, 20000);
                        if (!data || data.status === "error") {
                            return { error: "商品が見つかりませんでした。別のキーワードで試してください。" };
                        }

                        const product = data.product || {};
                        const prices = (data.prices || []).slice(0, 3);
                        const card = `<ProductCard name="${esc(product.name || keyword)}" brand="${esc(product.brand || "")}" imageurl="${product.imageUrl || ""}" price="${prices[0]?.price || ""}" rating="${product.rating || ""}" reviewcount="${product.reviewCount || ""}" category="${esc(product.category || "")}" url="${prices[0]?.url || ""}"></ProductCard>`;

                        return {
                            instructions: `商品が見つかりました！ YOU MUST INCLUDE EXACTLY THIS STRING IN YOUR RESPONSE AS-IS:\n\n${card}\n\nDo not modify the HTML tags. You MUST use the exact closing tag </ProductCard>. Before the card, write a short friendly paragraph about this product.`
                        };
                    },
                }),

                // ツール2: 商品詳細（AI口コミ要約付き）
                getProductDetails: tool({
                    description: "商品の詳細情報を取得。口コミAI要約、成分分析、価格比較を含む完全レポート。ユーザーが詳しく知りたいと言ったときに使用。",
                    parameters: z.object({
                        keyword: z.string().describe("商品名"),
                        barcode: z.string().optional().describe("JANコード（あれば精度向上）"),
                    }),
                    // @ts-ignore
                    execute: async ({ keyword, barcode }: { keyword: string; barcode?: string }) => {
                        console.log(`[cosme-chat] getProductDetails: ${keyword} (barcode: ${barcode || "none"})`);
                        const body: any = { keyword };
                        if (barcode) body.barcode = barcode;
                        const data = await callN8n("cosme-product-search", body, 55000);
                        if (!data || data.status === "error") {
                            return { error: "詳細情報を取得できませんでした。" };
                        }

                        const product = data.product || {};
                        const prices = (data.prices || []).slice(0, 5);
                        const summary = data.summary || {};
                        const cards: string[] = [];

                        // 商品カード
                        cards.push(`<ProductCard name="${esc(product.name || keyword)}" brand="${esc(product.brand || "")}" imageurl="${product.imageUrl || ""}" price="${prices[0]?.price || ""}" rating="${product.rating || ""}" reviewcount="${product.reviewCount || ""}" category="${esc(product.category || "")}" url="${prices[0]?.url || ""}"></ProductCard>`);

                        // 価格比較カード
                        if (prices.length > 0) {
                            const pricesJson = JSON.stringify(prices.map((p: any) => ({
                                source: p.source || "unknown",
                                shop: p.shop || "",
                                price: p.price,
                                url: p.url || "",
                                postage: p.postageFlag || "unknown",
                                isPrime: p.isPrime || false,
                            })));
                            cards.push(`<PriceCard prices="${esc(pricesJson)}" cheapest="${prices[0]?.source || ""}"></PriceCard>`);
                        }

                        // 成分カード
                        const ing = summary.ingredients || {};
                        if (ing.featured?.length || ing.caution?.length) {
                            let ngmatches = "";
                            if (profile?.ngIngredients?.length) {
                                const { checkNgIngredients } = await import("../../lib/compatibility");
                                const matches = checkNgIngredients(ing, profile.ngIngredients);
                                ngmatches = matches.join(",");
                            }
                            cards.push(`<IngredientCard featured="${esc((ing.featured || []).join(","))}" caution="${esc((ing.caution || []).join(","))}" ngmatches="${esc(ngmatches)}"></IngredientCard>`);
                        }

                        return {
                            instructions: `商品詳細が見つかりました！ YOU MUST INCLUDE EXACTLY THIS STRING IN YOUR RESPONSE AS-IS:\n\n${cards.join("\n\n")}\n\nDo not modify the HTML tags. Before the cards, summarize the AI review: ${esc((summary.text || "").substring(0, 200))}`
                        };
                    },
                }),

                // ツール3: トレンド商品取得
                getTrendingProducts: tool({
                    description: "いまXで話題のコスメ商品を取得。カテゴリ指定可能。",
                    parameters: z.object({
                        category: z.enum(["all", "skincare", "makeup", "haircare", "bodycare", "trending"]).optional().default("all").describe("カテゴリフィルタ"),
                    }),
                    // @ts-ignore
                    execute: async ({ category }: { category: string }) => {
                        console.log(`[cosme-chat] getTrendingProducts: ${category}`);
                        try {
                            const filePath = "/var/www/cosme.links-create.co.jp/data/cosme-trending.json";
                            const raw = readFileSync(filePath, "utf8");
                            const trending = JSON.parse(raw);
                            let products = trending.products || [];
                            if (category && category !== "all") {
                                products = products.filter((p: any) => p.category === category);
                            }
                            products = products.slice(0, 5);

                            if (products.length === 0) {
                                return { error: "トレンド情報が見つかりませんでした。" };
                            }

                            const items = products.map((p: any) => ({
                                name: p.productName || p.name || "",
                                brand: p.brand || "",
                                category: p.category || "",
                                reason: p.reason || p.buzzReason || "",
                            }));
                            const card = `<TrendingCard items="${esc(JSON.stringify(items))}"></TrendingCard>`;

                            return {
                                instructions: `トレンド商品が見つかりました！ YOU MUST INCLUDE EXACTLY THIS STRING IN YOUR RESPONSE AS-IS:\n\n${card}\n\nDo not modify the HTML tags. You MUST use the exact closing tag </TrendingCard>. Before the card, write a brief intro about current cosme trends.`
                            };
                        } catch (e: any) {
                            console.error("Trending read error:", e.message);
                            return { error: "トレンド情報を読み込めませんでした。" };
                        }
                    },
                }),

                // ツール4: 肌相性判定
                analyzeSkinCompatibility: tool({
                    description: "商品とユーザーの肌プロフィールの相性を分析。成分チェック・肌タイプ適合・NG成分検出を行う。",
                    parameters: z.object({
                        productName: z.string().describe("商品名"),
                    }),
                    // @ts-ignore
                    execute: async ({ productName }: { productName: string }) => {
                        console.log(`[cosme-chat] analyzeSkinCompatibility: ${productName}`);
                        if (!profile?.skinType) {
                            return { error: "肌プロフィールが未登録です。コスメスキャナーのプロフィール設定から登録してください。" };
                        }

                        const data = await callN8n("cosme-product-basic", { keyword: productName }, 20000);
                        if (!data || data.status === "error") {
                            return { error: "商品情報を取得できませんでした。" };
                        }

                        const summary = data.summary || {};
                        const ingredients = summary.ingredients || {};
                        const skinTypes = summary.skinTypes || {};

                        const result = calcCompatibility(profile, ingredients, skinTypes);
                        const cards: string[] = [];

                        // 成分カード
                        if (ingredients.featured?.length || ingredients.caution?.length) {
                            const { checkNgIngredients } = await import("../../lib/compatibility");
                            const ngmatches = checkNgIngredients(ingredients, profile.ngIngredients || []);
                            cards.push(`<IngredientCard featured="${esc((ingredients.featured || []).join(","))}" caution="${esc((ingredients.caution || []).join(","))}" ngmatches="${esc(ngmatches.join(","))}"></IngredientCard>`);
                        }

                        // 相性カード
                        cards.push(`<CompatCard score="${result.score}" good="${esc(result.details.good.join(","))}" bad="${esc(result.details.bad.join(","))}"></CompatCard>`);

                        return {
                            instructions: `肌相性分析結果です！ YOU MUST INCLUDE EXACTLY THIS STRING IN YOUR RESPONSE AS-IS:\n\n${cards.join("\n\n")}\n\nDo not modify the HTML tags. Before the cards, explain the compatibility score of ${result.score}/100 and key findings.`
                        };
                    },
                }),

                // ツール5: 価格比較
                comparePrices: tool({
                    description: "商品の楽天・Yahoo!・Amazonの価格を比較。送料込みの最安値を表示。",
                    parameters: z.object({
                        keyword: z.string().describe("商品名"),
                        barcode: z.string().optional().describe("JANコード"),
                    }),
                    // @ts-ignore
                    execute: async ({ keyword, barcode }: { keyword: string; barcode?: string }) => {
                        console.log(`[cosme-chat] comparePrices: ${keyword}`);
                        const body: any = { keyword };
                        if (barcode) body.barcode = barcode;
                        const data = await callN8n("cosme-product-basic", body, 20000);
                        if (!data || data.status === "error") {
                            return { error: "価格情報を取得できませんでした。" };
                        }

                        const product = data.product || {};
                        const prices = (data.prices || []).slice(0, 8);
                        if (prices.length === 0) {
                            return { error: "価格情報が見つかりませんでした。" };
                        }

                        const pricesJson = JSON.stringify(prices.map((p: any) => ({
                            source: p.source || "unknown",
                            shop: p.shop || "",
                            price: p.price,
                            url: p.url || "",
                            postage: p.postageFlag || "unknown",
                            isPrime: p.isPrime || false,
                        })));
                        const card = `<PriceCard prices="${esc(pricesJson)}" cheapest="${prices[0]?.source || ""}" productname="${esc(product.name || keyword)}"></PriceCard>`;

                        return {
                            instructions: `価格比較結果です！ YOU MUST INCLUDE EXACTLY THIS STRING IN YOUR RESPONSE AS-IS:\n\n${card}\n\nDo not modify the HTML tags. You MUST use the exact closing tag </PriceCard>. Before the card, mention the cheapest option and note ※PR（価格比較にはアフィリエイトリンクを含みます）.`
                        };
                    },
                }),
            },
        });

        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error("AI Error:", error);
        return new Response(JSON.stringify({ error: "チャットAPIでエラーが発生しました" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
