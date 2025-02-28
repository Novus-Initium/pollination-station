"use client";

import React from "react";

type ProposalCardProps = {
  id: number;
  title: string;
  dao: string;
  status: string;
  votes: number;
  created: string;
};

const ProposalCard: React.FC<ProposalCardProps> = ({ id, title, dao, status, votes, created }) => {
  return (
    <div key={id} className="p-4 bg-base-200 rounded-xl">
      <div className="flex justify-between mb-2">
        <h4 className="font-bold">{title}</h4>
        <span className={`badge ${status === 'Active' ? 'badge-primary' : 'badge-ghost'}`}>
          {status}
        </span>
      </div>
      <div className="flex justify-between text-sm opacity-70">
        <span>{dao}</span>
        <span>{created}</span>
      </div>
      <div className="flex justify-between text-sm opacity-70 mt-2">
        <span>Votes: {votes}</span>
      </div>
    </div>
  );
};

export default ProposalCard;
