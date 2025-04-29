import React from 'react';


function StepCard({ number, icon, title, description }) {
  return (
    <div className="relative bg-gray-900 p-8 rounded-xl">
      <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center font-bold">
        {number}
      </div>
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default StepCard;