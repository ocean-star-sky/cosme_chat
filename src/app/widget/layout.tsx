import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
    title: "コスメコンシェルジュ AI",
    robots: "noindex, nofollow",
};

// widget専用レイアウト: iframe埋め込み用
export default function WidgetLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <body style={{ margin: 0, padding: 0, overflow: "hidden", height: "100vh" }}>
                {children}
            </body>
        </html>
    );
}
