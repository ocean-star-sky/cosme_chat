// 肌相性スコア計算（cosme-scanner/src/js/skin-profile.js から移植）

export interface SkinProfile {
    skinType?: string;
    concerns?: string[];
    ngIngredients?: string[];
}

export interface IngredientsData {
    featured?: string[];
    caution?: string[];
    allDetected?: string[];
}

export interface SkinTypesData {
    recommended?: string[];
    caution?: string[];
}

export interface CompatibilityResult {
    score: number;
    details: { good: string[]; bad: string[] };
}

// プリセットNG成分
const NG_PRESETS: { id: string; name: string; keywords: string[] }[] = [
    { id: 'paraben', name: 'パラベン', keywords: ['パラベン', 'メチルパラベン', 'エチルパラベン', 'プロピルパラベン', 'ブチルパラベン'] },
    { id: 'alcohol', name: 'アルコール', keywords: ['エタノール', '変性アルコール'] },
    { id: 'fragrance', name: '合成香料', keywords: ['合成香料', '香料'] },
    { id: 'mineral_oil', name: '鉱物油', keywords: ['鉱物油', 'ミネラルオイル', 'パラフィン'] },
    { id: 'silicone', name: 'シリコン', keywords: ['シリコン', 'ジメチコン', 'シクロペンタシロキサン'] },
    { id: 'colorant', name: '合成着色料', keywords: ['合成着色料', 'タール色素'] },
    { id: 'uv_absorber', name: '紫外線吸収剤', keywords: ['紫外線吸収剤', 'オキシベンゾン', 'メトキシケイヒ酸'] },
    { id: 'peg', name: 'PEG系', keywords: ['PEG', 'ポリエチレングリコール'] },
    { id: 'sls', name: 'ラウリル硫酸Na', keywords: ['ラウリル硫酸Na', 'ラウリル硫酸ナトリウム'] },
    { id: 'sles', name: 'ラウレス硫酸Na', keywords: ['ラウレス硫酸Na', 'ラウレス硫酸ナトリウム'] },
];

// 肌悩みと有効成分マッピング
const CONCERN_INGREDIENTS: Record<string, string[]> = {
    acne: ['サリチル酸', 'ナイアシンアミド', 'ティーツリー'],
    aging: ['レチノール', 'ビタミンC誘導体', 'コエンザイムQ10', 'プラセンタ', 'ペプチド'],
    darkSpots: ['ビタミンC誘導体', 'アルブチン', 'トラネキサム酸', 'ナイアシンアミド'],
    dryness: ['ヒアルロン酸', 'セラミド', 'コラーゲン', 'スクワラン'],
    redness: ['セラミド', 'アラントイン', 'グリチルリチン酸', 'CICA', 'シカ'],
    pores: ['ナイアシンアミド', 'ビタミンC誘導体', 'サリチル酸'],
    wrinkles: ['レチノール', 'ペプチド', 'コラーゲン', 'ヒアルロン酸'],
};

const CONCERN_LABELS: Record<string, string> = {
    acne: 'ニキビ', aging: 'エイジング', darkSpots: 'シミ・くすみ',
    dryness: '乾燥', redness: '赤み・敏感', pores: '毛穴', wrinkles: 'シワ・たるみ',
};

const SKIN_TYPE_LABELS: Record<string, string> = {
    dry: '乾燥肌', oily: '脂性肌', combination: '混合肌', sensitive: '敏感肌', normal: '普通肌',
};

/** NG成分チェック */
export function checkNgIngredients(ingredients: IngredientsData, ngIngredients: string[]): string[] {
    if (!ngIngredients?.length) return [];
    const allText = [
        ...(ingredients.featured || []),
        ...(ingredients.caution || []),
        ...(ingredients.allDetected || []),
    ].join(' ');

    const matches: string[] = [];
    for (const ngId of ngIngredients) {
        const preset = NG_PRESETS.find(p => p.id === ngId);
        if (preset) {
            if (preset.keywords.some(kw => allText.includes(kw))) {
                matches.push(preset.name);
            }
        } else if (allText.includes(ngId)) {
            matches.push(ngId);
        }
    }
    return matches;
}

/** 相性スコア計算 */
export function calcCompatibility(
    profile: SkinProfile,
    ingredients: IngredientsData,
    skinTypes: SkinTypesData
): CompatibilityResult {
    let score = 70;
    const details = { good: [] as string[], bad: [] as string[] };
    const skinTypeLabel = SKIN_TYPE_LABELS[profile.skinType || ''] || '';

    // 肌タイプ適合
    if (skinTypes.recommended?.length && skinTypeLabel) {
        if (skinTypes.recommended.some(t => t.includes(skinTypeLabel) || skinTypeLabel.includes(t))) {
            score += 15;
            details.good.push(skinTypeLabel + 'におすすめ');
        }
    }
    if (skinTypes.caution?.length && skinTypeLabel) {
        if (skinTypes.caution.some(t => t.includes(skinTypeLabel) || skinTypeLabel.includes(t))) {
            score -= 15;
            details.bad.push(skinTypeLabel + 'は注意');
        }
    }

    // NG成分チェック
    const ngMatches = checkNgIngredients(ingredients, profile.ngIngredients || []);
    if (ngMatches.length > 0) {
        score -= ngMatches.length * 20;
        ngMatches.forEach(m => details.bad.push('NG: ' + m));
    }

    // 注意成分
    if (ingredients.caution?.length) {
        score -= ingredients.caution.length * 3;
    }

    // 有効成分（肌悩みマッチ）
    const matchedConcerns = new Set<string>();
    if (profile.concerns?.length && ingredients.featured?.length) {
        for (const concern of profile.concerns) {
            const beneficial = CONCERN_INGREDIENTS[concern] || [];
            for (const feat of ingredients.featured) {
                if (beneficial.some(b => feat.includes(b) || b.includes(feat))) {
                    if (!matchedConcerns.has(concern)) {
                        score += 5;
                        details.good.push(feat + 'が' + (CONCERN_LABELS[concern] || concern) + 'ケアに有効');
                        matchedConcerns.add(concern);
                    }
                    break;
                }
            }
        }
    }

    score = Math.max(0, Math.min(100, score));
    return { score, details };
}

/** NG成分ID→表示名変換 */
export function getNgNames(ngIds: string[]): string[] {
    return ngIds.map(id => {
        const preset = NG_PRESETS.find(p => p.id === id);
        return preset ? preset.name : id;
    });
}
