export default function Captions({ text, isLocal }) {
  if (!text) return null;
  
  return (
    <div 
      className={`absolute bottom-16 left-0 right-0 mx-auto w-max max-w-[80%] px-4 py-2 rounded-md text-center
        ${isLocal ? 'bg-blue-900 bg-opacity-70' : 'bg-green-900 bg-opacity-70'}`}
    >
      <p className="text-white text-lg font-medium">{text}</p>
    </div>
  );
} 