import React from 'react';


function BenefitCard({ icon, title, description }) {
  return (
    <div className="bg-gray-800 p-8 rounded-xl text-center">
      <div className="inline-block mb-6">{icon}</div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default BenefitCard;