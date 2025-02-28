"use client";

import React from "react";

type DAOCardProps = {
  id: number;
  name: string;
  description: string;
  match: number;
};


const DAOCard: React.FC<DAOCardProps> = ({ id, name, description, match }) => {

    return (
        <div key={id} className="flex items-center justify-between p-4 bg-base-200 rounded-xl">
        <div>
            <h4 className="font-bold">{name}</h4>
            <p className="text-sm opacity-70">{description}</p>
        </div>
        </div>
    );
    };

export default DAOCard;
