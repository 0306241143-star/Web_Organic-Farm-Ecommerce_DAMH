/* Shared image and video upload control. */
export default function FileUploader({ accept = "image/*,video/*", onChange }) {
  return <input type="file" accept={accept} onChange={onChange} />;
}
