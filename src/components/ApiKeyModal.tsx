
import React, { useState, useEffect } from 'react';
import { Key, Save, X } from 'lucide-react';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: string) => void;
    initialKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, initialKey = '' }) => {
    const [key, setKey] = useState(initialKey);
    const [error, setError] = useState('');

    useEffect(() => {
        setKey(initialKey);
    }, [initialKey]);

    if (!isOpen) return null;

    const handleSave = () => {
        const trimmedKey = key.trim();
        if (!trimmedKey) {
            setError('請輸入 API Key');
            return;
        }
        if (!trimmedKey.startsWith('AIza')) {
            setError('API Key 格式似乎不正確 (應以 AIza 開頭)');
            return;
        }
        setError('');
        onSave(trimmedKey);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0d0d0d] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                            <Key className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-black text-white uppercase tracking-widest">API Settings</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">
                            Google Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => {
                                setKey(e.target.value);
                                setError('');
                            }}
                            placeholder="AIza..."
                            className="w-full bg-[#141414] border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                        {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}
                        <p className="text-[10px] text-gray-600 ml-1 leading-relaxed">
                            您的 API Key 僅會儲存在本地瀏覽器中，用於直接與 Google Gemini 服務通訊。
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="w-full py-4 bg-white text-black hover:bg-gray-100 active:scale-[0.98] transition-all rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3"
                    >
                        <Save size={16} />
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
};
