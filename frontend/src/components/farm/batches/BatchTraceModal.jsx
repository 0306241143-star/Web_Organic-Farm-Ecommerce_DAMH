import QrPrintPreviewModal from "../modals/QrPrintPreviewModal";

export default function BatchTraceModal({ activeQrBatch, onClose }) {
  return (
    <QrPrintPreviewModal
      isOpen={!!activeQrBatch}
      onClose={onClose}
      batch={activeQrBatch}
    />
  );
}
