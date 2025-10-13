const LoadingComp = () => {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B] mx-auto mb-4"></div>
        <p className="text-[#9E9E9E]">Loading...</p>
      </div>
    </div>
  );
};

export default LoadingComp;
