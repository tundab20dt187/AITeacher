'use client';
import React, { useState } from 'react';
import Scene from './Scene';

export default function PresentationViewer() {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

    // Bạn nhớ thay link này bằng link SHARE dạng "Publish to web"
    const presentationUrl =
        "https://docs.google.com/presentation/d/e/2PACX-1vT3_f8yTjAK0cGw-presentation/embed?start=false&loop=false&delayms=3000";

    return (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, zIndex: 1 }} className="relative bg-black">

            {/* PRESENTATION AREA - FULL SCREEN */}
            <iframe
                src={presentationUrl}
                title="Presentation"
                className="w-full h-full border-0"
                allowFullScreen
            />

            {/* AVATAR OVERLAY (fixed-size container) */}
            <div
                className="
                    absolute bottom-5 right-5
                    w-[180px] h-[220px]
                    rounded-lg overflow-hidden
                    shadow-lg
                    bg-white/20 backdrop-blur-md
                    border border-white/40
                    z-30
                    transition-all duration-300
                    pointer-events-none
                "
            >
                <Scene isSpeaking={isSpeaking} />
            </div>
        </div>
    );
}
