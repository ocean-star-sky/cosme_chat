"use client";

import { useChat } from "ai/react";
import { useRef, useEffect } from "react";
import { Send, User, X, ShoppingCart, Sparkles, FlaskConical, Heart, TrendingUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import CosmeMascot from "./CosmeMascot";

interface ChatWindowProps {
    embedded?: boolean;
    onClose?: () => void;
    skinProfile?: any;
    currentProduct?: any;
}

export default function ChatWindow({ embedded = false, onClose, skinProfile, currentProduct }: ChatWindowProps) {
    const { messages, input, handleInputChange, handleSubmit, isLoading, error, append } = useChat({
        api: "/chat/api/chat",
        body: { skinProfile, currentProduct },
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendQuickAction = (text: string) => {
        append({ role: "user", content: text });
    };

    const wrapperClass = embedded
        ? "flex flex-col w-full h-full bg-white overflow-hidden"
        : "flex flex-col bg-white w-full h-full";

    return (
        <div className={wrapperClass} style={embedded ? { overscrollBehavior: "contain" } : {}}>
            {/* ヘッダー */}
            <div className="p-4 text-white flex justify-between items-center shrink-0" style={{ background: "#b84d73" }}>
                <div className="flex items-center gap-2">
                    <CosmeMascot size={28} />
                    <h3 className="font-bold text-sm">コスメコンシェルジュ AI</h3>
                </div>
                {onClose && (
                    <button onClick={onClose} className="hover:bg-[#a04060] p-1 rounded">
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* メッセージエリア */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                    <div className="text-center mt-6">
                        <CosmeMascot size={64} className="mx-auto mb-3" />
                        <p className="text-gray-700 font-bold text-sm mb-3">コスメのこと、何でも相談してね！</p>
                        <div className="flex flex-wrap justify-center gap-1.5 px-2">
                            {[
                                { label: "おすすめの化粧水は？", emoji: "💧" },
                                { label: "いまのトレンドコスメは？", emoji: "🔥" },
                                { label: "成分をチェックして", emoji: "🔬" },
                                { label: "最安値を比較して", emoji: "💰" },
                            ].map((q) => (
                                <button
                                    key={q.label}
                                    onClick={() => sendQuickAction(q.label)}
                                    className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-[12px] text-gray-600 hover:bg-pink-50 hover:border-pink-300 hover:text-pink-700 transition-colors cursor-pointer"
                                >
                                    {q.emoji} {q.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((m: any) => {
                    if (m.role === "tool" || !m.content || m.content.trim() === "") return null;

                    return (
                        <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                    m.role === "user" ? "bg-gray-200 text-gray-600" : "bg-pink-50"
                                }`}
                            >
                                {m.role === "user" ? <User size={16} /> : <CosmeMascot size={24} />}
                            </div>
                            <div
                                className={`max-w-[85%] rounded-2xl p-3 text-sm overflow-hidden ${
                                    m.role === "user"
                                        ? "text-white rounded-tr-none"
                                        : "bg-white border border-gray-200 text-gray-800 rounded-tl-none"
                                }`}
                                style={m.role === "user" ? { background: "#b84d73" } : {}}
                            >
                                {m.role === "user" ? (
                                    <div className="whitespace-pre-wrap">{m.content}</div>
                                ) : (
                                    <div className="prose prose-sm max-w-none prose-p:leading-relaxed">
                                        <ReactMarkdown
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                // 商品カード
                                                // @ts-ignore
                                                productcard: ({ node, ...props }: any) => {
                                                    const p = props || {};
                                                    return (
                                                        <div className="flex gap-3 p-3 mt-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow w-full">
                                                            {p.imageurl && (
                                                                <img src={p.imageurl} alt={p.name} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                                                            )}
                                                            <div className="flex flex-col flex-1 justify-between min-w-0">
                                                                {p.brand && <span className="text-[10px] text-pink-600 font-medium">{p.brand}</span>}
                                                                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-tight">{p.name || ""}</h4>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    {p.rating && <span className="text-yellow-500 text-xs">{"★".repeat(Math.round(Number(p.rating)))}</span>}
                                                                    {p.rating && <span className="text-[10px] text-gray-400">{p.rating}</span>}
                                                                    {p.reviewcount && <span className="text-[10px] text-gray-400">({p.reviewcount}件)</span>}
                                                                </div>
                                                                <div className="flex items-end justify-between mt-1 gap-2">
                                                                    <span className="text-pink-600 font-bold">{p.price ? `¥${Number(p.price).toLocaleString()}` : ""}</span>
                                                                    {p.url && (
                                                                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-pink-50 text-pink-600 hover:bg-pink-100 px-2 py-1 rounded-lg text-[11px] font-bold transition-colors no-underline shrink-0">
                                                                            <ShoppingCart size={12} />詳細
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                                // 価格比較カード
                                                // @ts-ignore
                                                pricecard: ({ node, ...props }: any) => {
                                                    const p = props || {};
                                                    let prices: any[] = [];
                                                    try { prices = JSON.parse((p.prices || "[]").replace(/&quot;/g, '"')); } catch {}
                                                    const sourceLabels: Record<string, string> = { rakuten: "楽天", yahoo: "Yahoo!", amazon: "Amazon" };
                                                    const sourceColors: Record<string, string> = { rakuten: "bg-red-50 text-red-600 hover:bg-red-100", yahoo: "bg-blue-50 text-blue-600 hover:bg-blue-100", amazon: "bg-orange-50 text-orange-600 hover:bg-orange-100" };
                                                    return (
                                                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-full">
                                                            <div className="flex items-center gap-1 mb-2">
                                                                <Sparkles size={14} className="text-pink-500" />
                                                                <span className="text-xs font-bold text-gray-700">価格比較</span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                {prices.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                                                                                {sourceLabels[item.source] || item.source}
                                                                            </span>
                                                                            <span className="text-[10px] text-gray-400 truncate">{item.shop}</span>
                                                                            {item.postage === "included" && <span className="text-[9px] text-green-600 bg-green-50 px-1 rounded shrink-0">送料込</span>}
                                                                            {item.isPrime && <span className="text-[9px] text-blue-600 bg-blue-50 px-1 rounded shrink-0">Prime</span>}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                                            <span className={`font-bold text-xs ${i === 0 ? "text-pink-600" : "text-gray-700"}`}>
                                                                                ¥{Number(item.price).toLocaleString()}
                                                                            </span>
                                                                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                                                                                className={`px-2 py-1 rounded text-[10px] font-bold no-underline ${sourceColors[item.source] || "bg-gray-50 text-gray-600"}`}>
                                                                                購入
                                                                            </a>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 mt-2">※PR（アフィリエイトリンクを含みます）</p>
                                                        </div>
                                                    );
                                                },
                                                // 成分カード
                                                // @ts-ignore
                                                ingredientcard: ({ node, ...props }: any) => {
                                                    const p = props || {};
                                                    const featured = (p.featured || "").split(",").filter(Boolean);
                                                    const caution = (p.caution || "").split(",").filter(Boolean);
                                                    const ngmatches = (p.ngmatches || "").split(",").filter(Boolean);
                                                    return (
                                                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-full">
                                                            <div className="flex items-center gap-1 mb-2">
                                                                <FlaskConical size={14} className="text-green-600" />
                                                                <span className="text-xs font-bold text-gray-700">成分分析</span>
                                                            </div>
                                                            {ngmatches.length > 0 && (
                                                                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2">
                                                                    <span className="text-[11px] font-bold text-red-600">⚠️ NG成分検出: {ngmatches.join("、")}</span>
                                                                </div>
                                                            )}
                                                            {featured.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-1.5">
                                                                    {featured.map((f: string, i: number) => (
                                                                        <span key={i} className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{f}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {caution.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {caution.map((c: string, i: number) => (
                                                                        <span key={i} className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full">{c}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                },
                                                // 肌相性カード
                                                // @ts-ignore
                                                compatcard: ({ node, ...props }: any) => {
                                                    const p = props || {};
                                                    const score = Number(p.score || 0);
                                                    const good = (p.good || "").split(",").filter(Boolean);
                                                    const bad = (p.bad || "").split(",").filter(Boolean);
                                                    const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
                                                    const circumference = 2 * Math.PI * 36;
                                                    const offset = circumference - (score / 100) * circumference;
                                                    return (
                                                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-full">
                                                            <div className="flex items-center gap-1 mb-2">
                                                                <Heart size={14} className="text-pink-500" />
                                                                <span className="text-xs font-bold text-gray-700">肌相性スコア</span>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <div className="relative w-20 h-20 shrink-0">
                                                                    <svg viewBox="0 0 80 80" className="w-full h-full">
                                                                        <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                                                                        <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6"
                                                                            strokeDasharray={circumference} strokeDashoffset={offset}
                                                                            strokeLinecap="round" transform="rotate(-90 40 40)" />
                                                                        <text x="40" y="44" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
                                                                    </svg>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    {good.map((g: string, i: number) => (
                                                                        <div key={`g${i}`} className="text-[11px] text-green-700">✓ {g}</div>
                                                                    ))}
                                                                    {bad.map((b: string, i: number) => (
                                                                        <div key={`b${i}`} className="text-[11px] text-orange-600">△ {b}</div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                                // トレンドカード
                                                // @ts-ignore
                                                trendingcard: ({ node, ...props }: any) => {
                                                    const p = props || {};
                                                    let items: any[] = [];
                                                    try { items = JSON.parse((p.items || "[]").replace(/&quot;/g, '"')); } catch {}
                                                    const catLabels: Record<string, string> = { skincare: "スキンケア", makeup: "メイク", haircare: "ヘアケア", bodycare: "ボディ", trending: "バズ" };
                                                    return (
                                                        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm w-full">
                                                            <div className="flex items-center gap-1 mb-2">
                                                                <TrendingUp size={14} className="text-orange-500" />
                                                                <span className="text-xs font-bold text-gray-700">Xで話題のコスメ</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {items.map((item: any, i: number) => (
                                                                    <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                                                                        <span className="text-sm font-bold text-pink-500 shrink-0">{i + 1}</span>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="text-xs font-bold text-gray-800 line-clamp-1">{item.name}</span>
                                                                                {item.category && (
                                                                                    <span className="text-[9px] bg-pink-50 text-pink-600 px-1 py-0.5 rounded shrink-0">{catLabels[item.category] || item.category}</span>
                                                                                )}
                                                                            </div>
                                                                            {item.brand && <span className="text-[10px] text-gray-400">{item.brand}</span>}
                                                                            {item.reason && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{item.reason}</p>}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                },
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {error && (
                    <div className="text-center text-red-500 font-bold mb-4 text-sm">
                        エラーが発生しました。（{error.message}）
                    </div>
                )}
                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
                            <CosmeMascot size={24} />
                        </div>
                        <div className="bg-white border border-gray-200 text-gray-800 p-3 rounded-2xl rounded-tl-none text-sm animate-pulse">
                            調べています...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 入力エリア */}
            <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200 flex gap-2 shrink-0">
                <input
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-900 border-transparent focus:bg-white focus:border-pink-400 rounded-full outline-none transition-colors text-sm"
                    value={input}
                    placeholder="コスメについて質問..."
                    onChange={handleInputChange}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input?.trim()}
                    className="w-10 h-10 text-white rounded-full flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    style={{ background: "#b84d73" }}
                >
                    <Send size={18} className="ml-0.5" />
                </button>
            </form>
        </div>
    );
}
