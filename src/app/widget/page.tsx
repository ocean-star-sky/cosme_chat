"use client";

import { useEffect, useState } from "react";
import ChatWindow from "../components/ChatWindow";

// 許可するオリジン
const ALLOWED_ORIGINS = [
    "https://cosme.links-create.co.jp",
];

interface SkinProfile {
    skinType: string;
    concerns: string[];
    ngIngredients: string[];
}

interface CurrentProduct {
    name: string;
    brand?: string;
    barcode?: string;
    category?: string;
}

export default function WidgetPage() {
    const [skinProfile, setSkinProfile] = useState<SkinProfile | null>(null);
    const [currentProduct, setCurrentProduct] = useState<CurrentProduct | null>(null);

    useEffect(() => {
        // iframe準備完了を親に通知
        window.parent.postMessage({ type: "cosme-chat-ready" }, "*");

        // 親からのメッセージを受信
        const handleMessage = (e: MessageEvent) => {
            // オリジン検証
            if (!ALLOWED_ORIGINS.includes(e.origin)) return;
            if (!e.data || !e.data.type) return;

            switch (e.data.type) {
                case "cosme-chat-init":
                    // 初期化: 肌プロフィールと閲覧中商品を受信
                    if (e.data.skinProfile) setSkinProfile(e.data.skinProfile);
                    if (e.data.currentProduct) setCurrentProduct(e.data.currentProduct);
                    break;
                case "cosme-product-update":
                    // 閲覧中商品の更新
                    setCurrentProduct(e.data.product || null);
                    break;
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleClose = () => {
        window.parent.postMessage({ type: "cosme-chat-close" }, "*");
    };

    return (
        <div style={{ width: "100%", height: "100vh" }}>
            <ChatWindow
                embedded
                onClose={handleClose}
                skinProfile={skinProfile}
                currentProduct={currentProduct}
            />
        </div>
    );
}
