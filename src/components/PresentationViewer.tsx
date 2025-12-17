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
                style={{
                    position: 'fixed',
                    bottom: 0,
                    right: 0,
                    width: '140px',
                    height: '170px',
                    borderTopLeftRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(12px)',
                    border: '2px solid rgb(34, 197, 94)',
                    zIndex: 30,
                    pointerEvents: 'none'
                }}
            >
                <Scene isSpeaking={isSpeaking} />
            </div>
        </div>
    );
}
