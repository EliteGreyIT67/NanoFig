import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="w-16 h-16 border-8 border-t-yellow-400 border-r-yellow-400 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
  );
};

export default Spinner;