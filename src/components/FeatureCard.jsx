import React from 'react';


function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-gray-800 p-8 rounded-xl hover:transform hover:scale-105 transition-all">
      <div className="mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default FeatureCard;