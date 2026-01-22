import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if device is iOS
        const isDeviceIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isDeviceIOS);

        // Standard PWA install prompt for Android/Desktop
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Show prompt after a short delay to not be intrusive immediately
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowPrompt(false);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
        setShowPrompt(false);
    };

    const handleClose = () => {
        setShowPrompt(false);
    };

    if (!showPrompt && !isIOS) return null;

    // iOS Instructions (different because it doesn't support beforeinstallprompt)
    if (isIOS && showPrompt) {
        return (
            <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#0B0B0B] border-t border-[#9E2A2B] shadow-2xl animate-in slide-in-from-bottom duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                            <img src="/icon-192.png" alt="App Icon" className="w-12 h-12 rounded-xl" />
                            <div>
                                <h3 className="font-bold text-white">Install MakeMyCut</h3>
                                <p className="text-sm text-gray-400">Install our app for a better experience</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="text-sm text-gray-300 bg-[#323232] p-3 rounded-lg">
                        Tap <span className="font-bold text-blue-400">Share</span> then <span className="font-bold">Add to Home Screen</span> <span className="text-xl">+</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-[#0B0B0B] border border-[#9E2A2B] rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-start gap-4">
                <div className="bg-white p-1 rounded-xl shrink-0">
                    <img src="/icon-192.png" alt="App Icon" className="w-10 h-10 rounded-lg" />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">Install App</h3>
                    <p className="text-sm text-gray-400 mb-3">
                        Book haircuts faster and use offline with the MakeMyCut app.
                    </p>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleInstallClick}
                            className="bg-[#9E2A2B] hover:bg-[#7a2021] text-white flex-1 h-9"
                        >
                            Install Now
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white h-9"
                        >
                            Maybe Later
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
