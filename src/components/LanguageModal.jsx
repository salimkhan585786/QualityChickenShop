import { X } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export default function LanguageModal({ open, onClose }) {
  const { language, setLanguage, languageOptions, t } = useI18n();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">{t('language.select', 'Select Language')}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {languageOptions.map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLanguage(option.code);
                onClose();
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left font-medium transition-colors ${
                language === option.code
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
              }`}
            >
              {t(option.labelKey, option.code)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
