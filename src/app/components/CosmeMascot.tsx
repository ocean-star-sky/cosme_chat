// コスメコンシェルジュ マスコットSVG（口紅モチーフ）
export default function CosmeMascot({ size = 24, className = "" }: { size?: number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* 口紅ケース下部 */}
            <rect x="32" y="50" width="36" height="38" rx="4" fill="#c9a0b0" />
            {/* 口紅ケース上部（キャップ） */}
            <rect x="34" y="52" width="32" height="34" rx="3" fill="#b84d73" />
            {/* 口紅本体（斜めカット） */}
            <path d="M 36 52 L 36 28 Q 36 22 50 16 Q 64 22 64 28 L 64 52 Z" fill="#e06088" />
            {/* 口紅ハイライト */}
            <path d="M 40 52 L 40 30 Q 40 25 48 20 L 48 52 Z" fill="#e88aaa" opacity="0.6" />
            {/* キラキラ（左上） */}
            <circle cx="24" cy="24" r="2" fill="#f0c0d0" />
            <line x1="24" y1="18" x2="24" y2="30" stroke="#f0c0d0" strokeWidth="1" />
            <line x1="18" y1="24" x2="30" y2="24" stroke="#f0c0d0" strokeWidth="1" />
            {/* キラキラ（右上） */}
            <circle cx="78" cy="30" r="1.5" fill="#f0c0d0" />
            <line x1="78" y1="25" x2="78" y2="35" stroke="#f0c0d0" strokeWidth="0.8" />
            <line x1="73" y1="30" x2="83" y2="30" stroke="#f0c0d0" strokeWidth="0.8" />
            {/* 目（左） */}
            <ellipse cx="42" cy="68" rx="3" ry="3.5" fill="#1A1A1A" />
            <ellipse cx="43" cy="66.5" rx="1.2" ry="1.2" fill="#FFFFFF" />
            {/* 目（右） */}
            <ellipse cx="58" cy="68" rx="3" ry="3.5" fill="#1A1A1A" />
            <ellipse cx="59" cy="66.5" rx="1.2" ry="1.2" fill="#FFFFFF" />
            {/* ほっぺ */}
            <ellipse cx="35" cy="74" rx="5" ry="3" fill="#f0a0b8" opacity="0.6" />
            <ellipse cx="65" cy="74" rx="5" ry="3" fill="#f0a0b8" opacity="0.6" />
            {/* 口（にっこり） */}
            <path d="M 44 77 Q 50 83 56 77" stroke="#1A1A1A" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
    );
}
