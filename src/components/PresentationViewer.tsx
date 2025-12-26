'use client';
import React, { useState } from 'react';
import Scene from './Scene';

export default function PresentationViewer() {
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [presentationUrl, setPresentationUrl] = useState<string>(
        ""
    );
    const [inputUrl, setInputUrl] = useState<string>(presentationUrl);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [currentSlide, setCurrentSlide] = useState<number>(0);
    const [slideContents, setSlideContents] = useState<{ [key: number]: { text: string; notes: string; slideId: string } }>({});
    const [manualNotes, setManualNotes] = useState<string>('');
    const [showNotesInput, setShowNotesInput] = useState<boolean>(false);
    const [showAvatar, setShowAvatar] = useState<boolean>(false);
    const [isLoadingTTS, setIsLoadingTTS] = useState<boolean>(false);
    const [currentLine, setCurrentLine] = useState<number>(0);
    const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const pauseTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const controlsDisabled = isPlaying || isLoadingTTS;

    React.useEffect(() => {
        return () => {
            stopAllSpeech();
        };
    }, []);

    const stopAllSpeech = () => {
        if (pauseTimeoutRef.current) {
            clearTimeout(pauseTimeoutRef.current);
            pauseTimeoutRef.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
        }
        setIsSpeaking(false);
        setIsPlaying(false);
    };

    // Web Speech disabled per request; VBee direct audio only.

    const getLinesForSlide = (slideNumber: number, mapOverride?: { [key: number]: { text: string; notes: string; slideId: string } }): string[] => {
        const sourceMap = mapOverride ?? slideContents;
        const slideData = sourceMap[slideNumber];
        const raw = slideData?.notes ?? slideData?.text ?? `Slide ${slideNumber + 1}`;
        const normalized = raw
            .replace(/<br\s*\/?\s*>/gi, '\n') // HTML breaks
            .replace(/\x0B/g, '\n'); // vertical tab separators

        return normalized
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);
    };

    const handleTTS = async (text: string): Promise<string> => {
        const payload = {
            app_id: '3f1d18a7-7aa8-4323-8087-4c0051b6eb1e',
            response_type: 'direct',
            input_text: text,
            voice_code: 'hn_male_manhdung_news_48k-fhg'
        };

        setIsLoadingTTS(true);
        try {
            const postRes = await fetch('https://vbee.vn/api/v1/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${process.env.NEXT_PUBLIC_VBEE_TOKEN}`
                },
                body: JSON.stringify(payload)
            });

            if (!postRes.ok) {
                const respText = await postRes.text();
                throw new Error(`VBee TTS error ${postRes.status}: ${respText}`);
            }

            const postData = await postRes.json();
            console.log('VBee TTS post response:', postData);

            // Direct mode should return audio_link immediately.
            const audioLink = postData?.audio_link
                || postData?.data?.audio_link
                || postData?.result?.audio_link
                || postData?.url
                || postData?.data?.url
                || postData?.result?.url;

            if (!audioLink) {
                throw new Error(`VBee TTS missing audio_link. Response keys: ${Object.keys(postData || {}).join(',')}`);
            }

            return audioLink as string;
        } finally {
            setIsLoadingTTS(false);
        }
    };

    const playAudioUrl = (url: string) => {
        return new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);
            audioRef.current = audio;
            setIsSpeaking(true);
            console.log('🎧 Playing audio segment');

            audio.onended = () => {
                audioRef.current = null;
                setIsSpeaking(false);
                resolve();
            };
            audio.onerror = (event) => {
                console.error('🔁 Audio error:', event);
                audioRef.current = null;
                setIsSpeaking(false);
                reject(new Error('Audio playback failed'));
            };

            audio.play().catch(err => {
                console.error('🔁 Audio play failed:', err);
                audioRef.current = null;
                setIsSpeaking(false);
                reject(err);
            });
        });
    };

    const handleLoadPresentation = async () => {
        if (controlsDisabled) return;
        if (!inputUrl.trim()) return;

        let url = inputUrl.trim();
        let presentationId: string | null = null;

        const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (dMatch && dMatch[1] !== 'e') {
            presentationId = dMatch[1];
        }

        console.log('📌 Extracted presentation ID:', presentationId);
        console.log('📌 Original URL:', url);

        const srcMatch = url.match(/src="([^"]+)"/);
        if (srcMatch) {
            url = srcMatch[1];
        }

        if (presentationId) {
            url = `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&slide=id.p0&rm=minimal`;
        }

        setPresentationUrl(url);
        setIsPlaying(false);
        setCurrentSlide(0);
        setCurrentLine(0);

        if (!presentationId) {
            console.error('❌ Could not extract presentation ID from URL');
            console.error('💡 Please paste a valid Google Slides URL');
            return;
        }

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

                const firstLines = getLinesForSlide(0, contentMap);
                if (firstLines.length) {
                    await playLineAt(0, 0, contentMap);
                } else {
                    console.warn('⚠️ No lines to play on first slide after load.');
                }
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
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLoadPresentation();
        }
    };

    const moveAndPlay = async (delta: number) => {
        if (isPlaying || isLoadingTTS) return;
        const slidesCount = Object.keys(slideContents).length;
        const resolveLines = (slideIndex: number) => {
            const lines = getLinesForSlide(slideIndex);
            return lines.length ? lines : [`Slide ${slideIndex + 1}`];
        };

        let targetSlide = currentSlide;
        let lines = resolveLines(targetSlide);
        let targetLine = currentLine + delta;

        if (targetLine >= lines.length) {
            if (targetSlide + 1 < slidesCount) {
                targetSlide += 1;
                lines = resolveLines(targetSlide);
                targetLine = 0;
            } else {
                targetLine = lines.length - 1;
            }
        } else if (targetLine < 0) {
            if (targetSlide > 0) {
                targetSlide -= 1;
                lines = resolveLines(targetSlide);
                targetLine = Math.max(lines.length - 1, 0);
            } else {
                targetLine = 0;
            }
        }

        stopAllSpeech();
        setIsPlaying(false);
        setCurrentSlide(targetSlide);
        setCurrentLine(targetLine);

        await playLineAt(targetSlide, targetLine);
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
                
                console.log(`🔄 Changing to slide ${currentSlide}, slideId: ${slideId}`);
                console.log(`📊 Available slide IDs:`, Object.keys(slideContents).map(k => `${k}: ${slideContents[parseInt(k)]?.slideId}`));
                
                // Construct URL with specific slide and rm=minimal to hide controls
                const newUrl = `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000&slide=id.${slideId}&rm=minimal`;
                
                if (iframeRef.current && iframeRef.current.src !== newUrl) {
                    iframeRef.current.src = newUrl;
                    console.log(`📄 Loading slide ${currentSlide} (ID: ${slideId}):`, newUrl);
                } else {
                    console.log(`⏭️ Same URL, skipping reload`);
                }
            }
        }
    }, [currentSlide, presentationUrl, slideContents]);

    // Log slide changes when currentSlide updates
    React.useEffect(() => {
        if (currentSlide >= 0) {
            logSlideChange(currentSlide);
        }
    }, [currentSlide, slideContents]);

    const playLineAt = async (slideIndex: number, lineIndex: number, mapOverride?: { [key: number]: { text: string; notes: string; slideId: string } }) => {
        const lines = getLinesForSlide(slideIndex, mapOverride);
        if (!lines.length) {
            console.warn('⚠️ No content to speak for this slide.');
            return;
        }

        const clampedIndex = Math.min(lineIndex, lines.length - 1);
        if (clampedIndex !== lineIndex) {
            setCurrentLine(clampedIndex);
        }

        const lineText = lines[clampedIndex];
        console.log(`▶️ Playing line ${clampedIndex + 1}/${lines.length} (slide ${slideIndex}):`, lineText);

        stopAllSpeech();
        setIsPlaying(true);

        try {
            const url = await handleTTS(lineText);
            setLastAudioUrl(url);
            await playAudioUrl(url);
        } catch (err) {
            console.error('⚠️ VBee failed while playing line.', err);
        } finally {
            setIsSpeaking(false);
            setIsPlaying(false);
        }
    };

    const handlePlayClick = async () => {
        if (isPlaying || isLoadingTTS) return;
        if (!lastAudioUrl) {
            console.warn('⚠️ No cached audio to replay.');
            return;
        }
        stopAllSpeech();
        setIsPlaying(true);
        try {
            await playAudioUrl(lastAudioUrl);
        } catch (err) {
            console.error('⚠️ Failed to replay cached audio.', err);
        } finally {
            setIsSpeaking(false);
            setIsPlaying(false);
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
                moveAndPlay(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveAndPlay(-1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                setCurrentSlide(0);
                setCurrentLine(0);
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
                moveAndPlay(1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                moveAndPlay(-1);
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
        const lines = getLinesForSlide(slideNumber);
        if (!lines.length) {
            console.warn('⚠️ No lines available for this slide.');
        } else if (currentLine >= lines.length) {
            setCurrentLine(0);
        }
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
                    disabled={controlsDisabled}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: controlsDisabled ? 'rgb(107, 114, 128)' : 'rgba(197, 189, 34, 1)',
                        color: controlsDisabled ? 'white' : 'black',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                        opacity: controlsDisabled ? 0.7 : 1,
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    Load
                </button>

                <button
                    onClick={() => setShowAvatar(prev => !prev)}
                    disabled={controlsDisabled}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: showAvatar ? 'rgba(175, 34, 197, 1)' : 'rgb(107, 114, 128)',
                        color: showAvatar ? 'black' : 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                        opacity: controlsDisabled ? 0.7 : 1,
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    {showAvatar ? 'Hide Avatar' : 'Show Avatar'}
                </button>

                <button
                    onClick={handlePlayClick}
                    disabled={controlsDisabled}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: controlsDisabled ? 'rgb(107, 114, 128)' : 'rgba(197, 34, 37, 1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                        opacity: controlsDisabled ? 0.7 : 1,
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    Replay
                </button>

                {isLoadingTTS && (
                    <span style={{ color: 'rgb(34, 197, 94)', fontSize: '13px', fontWeight: 'bold' }}>
                        Đang tạo TTS...
                    </span>
                )}


                <button
                    onClick={() => {
                        if (!controlsDisabled) moveAndPlay(-1);
                        setTimeout(() => iframeRef.current?.focus(), 100);
                    }}
                    disabled={controlsDisabled}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: controlsDisabled ? 'rgb(107, 114, 128)' : 'rgb(34, 197, 94)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                        opacity: controlsDisabled ? 0.7 : 1,
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}
                >
                    ← Prev
                </button>

                <button
                    onClick={() => {
                        if (!controlsDisabled) moveAndPlay(1);
                        setTimeout(() => iframeRef.current?.focus(), 100);
                    }}
                    disabled={controlsDisabled}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: controlsDisabled ? 'rgb(107, 114, 128)' : 'rgb(34, 197, 94)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                        opacity: controlsDisabled ? 0.7 : 1,
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
                            setCurrentLine(0);
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
                        disabled={controlsDisabled}
                        style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: controlsDisabled ? 'rgb(107, 114, 128)' : 'rgb(34, 197, 94)',
                            color: controlsDisabled ? 'white' : 'black',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: controlsDisabled ? 'not-allowed' : 'pointer',
                            opacity: controlsDisabled ? 0.7 : 1,
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}
                    >
                        Save Notes
                    </button>
                </div>
            )}

            {/* PRESENTATION IFRAME */}
            <div style={{
                position: 'absolute',
                top: '60px', // Space for control bar
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: 'calc(100vh - 60px)'
            }}>
                <iframe
                    ref={iframeRef}
                    src={presentationUrl}
                    title="Presentation"
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                        pointerEvents: 'none' // Disable all click and keyboard interactions
                    }}
                    allowFullScreen
                />
            </div>

            {/* AVATAR OVERLAY */}
            {showAvatar && (
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
            )}
        </div>
    );
}
