import React from 'react';
import { motion } from 'framer-motion';
import { RecallInfo } from '../../types';
import { Icons } from '../Icon';
import { useTranslation } from '../../hooks/useTranslation';
import { formatDate } from '../../utils/dateUtils';
import { Button, IconButton } from '@mui/material';

interface ViewRecallsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recalls: RecallInfo[];
  vehicleNickname: string;
}

const bottomSheetVariants = {
  hidden: { y: "100%", opacity: 0.9 },
  visible: { 
    y: 0, 
    opacity: 1, 
    transition: { type: "spring" as const, stiffness: 130, damping: 22, duration: 0.35 } // Consistent with AddVehicleModal
  },
  exit: { 
    y: "100%", 
    opacity: 0.9, 
    transition: { duration: 0.25, ease: "anticipate" as const } // Consistent
  }
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: "easeInOut" as const } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: "easeInOut" as const } }
};

function normalizeAndFormatDate(dateStr: string, language: string) {
  if (!dateStr) return '';
  // If already ISO, just format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return formatDate(dateStr, language);
  // If DD/MM/YYYY, convert to YYYY-MM-DD
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return formatDate(`${yyyy}-${mm}-${dd}`, language);
  }
  // Fallback
  return formatDate(dateStr, language);
}

const RecallDetailItem: React.FC<{ labelKey: string, value?: string }> = ({ labelKey, value }) => {
  const { t } = useTranslation();
  if (!value) return null;
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-[#a0a0a0] uppercase tracking-wider">{t(labelKey)}</p>
      <p className="text-sm text-[#cfcfcf] whitespace-pre-wrap">{value}</p>
    </div>
  );
};

const ViewRecallsModal: React.FC<ViewRecallsModalProps> = ({ isOpen, onClose, recalls, vehicleNickname }) => {
  const { t, language } = useTranslation();

  // Always call hooks before any return
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Early return after all hooks
  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm z-50"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        variants={bottomSheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed bottom-0 left-0 right-0 bg-[#1c1c1c] p-4 pt-5 sm:p-6 md:p-8 rounded-t-2xl shadow-2xl w-full h-[80vh] flex flex-col border-t border-s border-e border-[#333333]"
      >
        <div className="flex justify-between items-center mb-4 md:mb-6 flex-shrink-0">
          <h2 className="text-lg md:text-xl font-bold text-white font-heading uppercase tracking-wide">
            {t('viewRecallsModal.title', { nickname: vehicleNickname })}
          </h2>
          <IconButton 
            onClick={onClose} 
            className="text-[#a0a0a0] hover:text-[#F7C843] p-1 md:p-1.5 rounded-full hover:bg-[#2a2a2a] transition-colors" 
            aria-label={t('common.closeModalAria')}
            size="small"
          >
            <Icons.XMark className="w-5 h-5 md:w-6 md:w-6" strokeWidth={2.5}/>
          </IconButton>
        </div>

        <div className="overflow-y-auto flex-grow pe-2 -me-2 scrollbar-thin scrollbar-thumb-[#404040] scrollbar-track-[#2a2a2a] pb-2">
          {recalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#a0a0a0] text-center">
              <span className="text-5xl mb-3">🎉</span>
              <span className="text-lg font-semibold mb-2">{t('viewRecallsModal.noRecalls')}</span>
            </div>
          ) : (
            <motion.ul 
              className="space-y-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } }}} // Stagger children entry
            >
              {recalls.map((recall) => (
                <motion.li 
                  key={recall.id}
                  className="bg-[#2a2a2a]/50 p-3 md:p-4 rounded-lg border border-[#404040] shadow-md"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }} // Subtle entry
                >
                  <RecallDetailItem labelKey="viewRecallsModal.recallID" value={(recall as any).reference || recall.nhtsaCampaignNumber || recall.id} />
                  <RecallDetailItem labelKey="viewRecallsModal.brand" value={(recall as any).brand || (recall as any).manufacturer} />
                  <RecallDetailItem labelKey="viewRecallsModal.model" value={(recall as any).model} />
                  <RecallDetailItem labelKey="viewRecallsModal.consequence" value={recall.consequence} />
                  <RecallDetailItem labelKey="viewRecallsModal.remedy" value={recall.remedy} />
                  <RecallDetailItem labelKey="viewRecallsModal.reportedDate" value={normalizeAndFormatDate((recall as any).date || recall.reportReceivedDate, language)} />
                  {(recall as any).detailUrl && (
                    <a
                      href={(recall as any).detailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {t('viewRecallsModal.viewDetails')}
                    </a>
                  )}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </div>

        <div className="mt-auto pt-4 md:pt-6 border-t border-[#333333] flex justify-end flex-shrink-0">
          <Button 
            variant="outlined"
            color="primary"
            onClick={onClose}
            sx={{ fontWeight: 'bold' }}
          >
            {t('common.dismiss')}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ViewRecallsModal;
