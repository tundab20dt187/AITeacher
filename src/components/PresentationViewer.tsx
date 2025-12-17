'use client';
import React, { useState } from 'react';
import Scene from './Scene';

export default function PresentationViewer() {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [presentationUrl, setPresentationUrl] = useState<string>(
        "https://docs.google.com/presentation/d/1I-URCin_CKiU37HOe_JkBX9pW5s39lIbRyF4Fn7Kc-E/edit?slide=id.p1#slide=id.p1"
    );
    const [inputUrl, setInputUrl] = useState<string>(presentationUrl);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [slideDuration, setSlideDuration] = useState<number>(5);
    const [currentSlide, setCurrentSlide] = useState<number>(0);
    const [slideContents, setSlideContents] = useState<{ [key: number]: { text: string; notes: string; slideId: string } }>({});
    const [manualNotes, setManualNotes] = useState<string>('');
    const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
    const [lastKeyPressTime, setLastKeyPressTime] = useState<number>(0);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    const handleLoadPresentation = async () => {
        if (inputUrl.trim()) {
            let url = inputUrl.trim();
            
            // Extract presentation ID from URL
            // For edit URLs: /d/{id}/edit or /d/{id}/edit?slide=...
            let presentationId = null;
            
            // Try to extract from /d/ format (any variant)
            const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (dMatch && dMatch[1] !== 'e') {
                presentationId = dMatch[1];
            }
            
            console.log('📌 Extracted presentation ID:', presentationId);
            console.log('📌 Original URL:', url);
            
            // Extract src from iframe code if pasted
            const srcMatch = url.match(/src="([^"]+)"/);
            if (srcMatch) {
                url = srcMatch[1];
            }
            
            // Convert edit link to embed link with minimal controls
            if (presentationId) {
                url = `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&slide=id.p0&rm=minimal`;
            }
            
            setPresentationUrl(url);
            setIsPlaying(false);
            setCurrentSlide(0); // Reset to first slide
            
            // Fetch slide contents from API (only if we have a valid presentation ID)
            if (presentationId) {
                console.log('📤 Sending to API:', { presentationId });
                try {
                    const response = await fetch('/api/slides', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ presentationId }),
                    });
                    
                    const data = await response.json();
                    console.log('🔍 API Response:', data);
                    
                    if (data.slides) {
                        const contentMap: { [key: number]: { text: string; notes: string; slideId: string } } = {};
                        data.slides.forEach((slide: any) => {
                            contentMap[slide.slideIndex] = {
                                text: slide.text,
                                notes: slide.notes,
                                slideId: slide.slideId
                            };
                        });
                        setSlideContents(contentMap);
                        console.log('✅ Slide contents loaded:', contentMap);
                    } else if (data.error) {
                        console.error('❌ API Error:', data.error);
                        if (data.error.includes('not supported')) {
                            console.warn('⚠️ This presentation format is not supported by Google Slides API.');
                            console.warn('💡 Use the "Add Notes" button to manually enter speaker notes for each slide.');
                            setShowNotesInput(true);
                        } else {
                            console.error('💡 Tip: Make sure to share your presentation with:', 'aiteacher-slides@ultra-light-480107-r9.iam.gserviceaccount.com');
                        }
                    }
                } catch (error) {
                    console.error('❌ Error fetching slides:', error);
                }
            } else {
                console.error('❌ Could not extract presentation ID from URL');
                console.error('💡 Please paste a valid Google Slides URL');
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLoadPresentation();
        }
    };

    const nextSlide = () => {
        setCurrentSlide(prev => prev + 1);
    };

    const prevSlide = () => {
        setCurrentSlide(prev => Math.max(0, prev - 1));
    };

    // Update iframe URL when slide changes to force navigation
    React.useEffect(() => {
        if (presentationUrl && currentSlide >= 0) {
            // Extract base URL and presentation ID
            const urlMatch = presentationUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
            if (urlMatch) {
                const presentationId = urlMatch[1];
                
                // Get the actual slide ID from slideContents
                const slideId = slideContents[currentSlide]?.slideId || `p${currentSlide}`;
                
                // Construct URL with specific slide and rm=minimal to hide controls
                const newUrl = `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&slide=id.${slideId}&rm=minimal`;
                
                if (iframeRef.current && iframeRef.current.src !== newUrl) {
                    iframeRef.current.src = newUrl;
                    console.log(`📄 Loading slide ${currentSlide} (ID: ${slideId}):`, newUrl);
                }
            }
        }
    }, [currentSlide, presentationUrl, slideContents]);

    React.useEffect(() => {
        if (!isPlaying) return;
        const interval = setInterval(() => {
            nextSlide();
        }, slideDuration * 1000);
        return () => clearInterval(interval);
    }, [isPlaying, slideDuration]);

    // Log slide changes when currentSlide updates
    React.useEffect(() => {
        if (currentSlide >= 0) {
            logSlideChange(currentSlide);
        }
    }, [currentSlide, slideContents]);

    const handlePlayClick = async () => {
        setIsPlaying(!isPlaying);
        if (!isPlaying) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.log('Fullscreen not supported');
            }
        } else {
            try {
                await document.exitFullscreen();
            } catch (err) {
                console.log('Exit fullscreen failed');
            }
        }
    };

    React.useEffect(() => {
        // Only listen for keyboard shortcuts outside the iframe
        const handleGlobalKeyPress = (e: KeyboardEvent) => {
            // Only respond when NOT typing in an input field
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }
            
            // Only respond when NOT focused on iframe
            if (document.activeElement === iframeRef.current) {
                return;
            }
            
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'Home') {
                e.preventDefault();
                setCurrentSlide(0);
            }
        };

        document.addEventListener('keydown', handleGlobalKeyPress);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeyPress);
        };
    }, []);

    React.useEffect(() => {
        if (!isPlaying) return;

        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === ' ') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'Escape') {
                setIsPlaying(false);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying]);

    const logSlideChange = (slideNumber: number) => {
        const timestamp = new Date().toLocaleTimeString();
        const message = `[${timestamp}] Slide changed (Slide ${slideNumber})`;
        console.log(message);
        
        // Print slide content and notes to console
        const slideData = slideContents && slideContents[slideNumber];
        const slideText = slideData?.text || `Slide ${slideNumber + 1}`;
        const slideNotes = slideData?.notes || '';
        
        console.log(`📄 Slide ${slideNumber} Content:`, slideText);
        console.log(`📝 Slide ${slideNumber} Notes:`, slideNotes);
        
        // Trigger TTS for the slide notes (or content if no notes)
        speakSlideContent(slideNumber);
    };

    const speakSlideContent = (slideNumber: number) => {
        // Prioritize notes over slide text
        const slideData = slideContents && slideContents[slideNumber];
        const content = slideData?.notes || slideData?.text || `Slide ${slideNumber + 1}`;
        
        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        // Speak
        window.speechSynthesis.speak(utterance);
        
        console.log(`📢 Speaking: "${content}"`);
    };

    const saveManualNotes = () => {
        if (manualNotes.trim()) {
            setSlideContents(prev => ({
                ...prev,
                [currentSlide]: {
                    text: prev[currentSlide]?.text || '',
                    notes: manualNotes.trim(),
                    slideId: prev[currentSlide]?.slideId || `p${currentSlide}`
                }
            }));
            setManualNotes('');
            console.log(`✅ Notes saved for slide ${currentSlide}`);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', margin: 0, padding: 0, zIndex: 0 }} className="relative bg-black">
            
            {/* HELP TOOLTIP */}
            <div style={{
                position: 'fixed',
                bottom: '190px',
                right: '10px',
                zIndex: 9997,
                padding: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderRadius: '8px',
                border: '1px solid rgb(34, 197, 94)',
                color: 'white',
                fontSize: '12px',
                maxWidth: '200px',
                lineHeight: '1.4'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>📖 How to use:</div>
                <div>• Use Prev/Next buttons to navigate</div>
                <div style={{ marginTop: '4px' }}>• TTS speaks automatically</div>
                <div style={{ marginTop: '4px' }}>• Arrow keys work when focused outside iframe</div>
            </div>
            
            {/* CONTROL BAR AT TOP */}
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                padding: '12px 20px',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(8px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
                pointerEvents: 'auto'
            }}>
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter Google Slides embed URL..."
                    style={{
                        flex: 1,
                        minWidth: '200px',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        border: '1px solid rgb(34, 197, 94)',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none'
                    }}
                />
                
                <button
                    onClick={handleLoadPresentation}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgb(34, 197, 94)',
                        color: 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    Load
                </button>

                <button
                    onClick={handlePlayClick}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: isPlaying ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    {isPlaying ? 'Pause' : 'Play'}
                </button>

                <button
                    onClick={() => {
                        prevSlide();
                        // Give focus to iframe so user can use arrow keys
                        setTimeout(() => iframeRef.current?.focus(), 100);
                    }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgb(107, 114, 128)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    ← Prev
                </button>

                <button
                    onClick={() => {
                        nextSlide();
                        // Give focus to iframe so user can use arrow keys
                        setTimeout(() => iframeRef.current?.focus(), 100);
                    }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgb(107, 114, 128)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    Next →
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'white', fontSize: '14px' }}>Slide:</span>
                    <input
                        type="number"
                        min="0"
                        value={currentSlide}
                        onChange={(e) => {
                            const newSlide = parseInt(e.target.value) || 0;
                            setCurrentSlide(Math.max(0, newSlide));
                        }}
                        style={{
                            width: '60px',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            border: '1px solid rgb(34, 197, 94)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* MANUAL NOTES INPUT */}
            {showNotesInput && (
                <div style={{
                    position: 'fixed',
                    top: '70px',
                    left: '20px',
                    right: '180px',
                    zIndex: 9998,
                    padding: '15px',
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: '8px',
                    border: '1px solid rgb(34, 197, 94)',
                }}>
                    <div style={{ color: 'white', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>
                        Notes for Slide {currentSlide + 1}:
                    </div>
                    <textarea
                        value={manualNotes || slideContents[currentSlide]?.notes || ''}
                        onChange={(e) => setManualNotes(e.target.value)}
                        placeholder="Enter speaker notes for this slide..."
                        style={{
                            width: '100%',
                            height: '80px',
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid rgb(34, 197, 94)',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            fontSize: '14px',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        onClick={saveManualNotes}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: 'rgb(34, 197, 94)',
                            color: 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}
                    >
                        Save Notes
                    </button>
                </div>
            )}

            {/* PRESENTATION IFRAME */}
            <iframe
                ref={iframeRef}
                src={presentationUrl}
                title="Presentation"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block'
                }}
                allowFullScreen
            />

            {/* AVATAR OVERLAY */}
            <div style={{
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
            }}>
                <Scene isSpeaking={isSpeaking} />
            </div>
        </div>
    );
}
