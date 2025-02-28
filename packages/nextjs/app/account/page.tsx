"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import dynamic from "next/dynamic";
import NavigationTabs from "~~/components/pollination-station/NavigationTabs";
import DAOCard from "~~/components/pollination-station/DAOCard";
import ProposalCard from "~~/components/pollination-station/ProposalCard";

const HandleNeed = dynamic(() => import("~~/components/pollination-station/HandleNeed"), { ssr: false });
const HandlePollin = dynamic(() => import("~~/components/pollination-station/HandlePollin"), { ssr: false });
const CreateDAOForm = dynamic(() => import("~~/components/pollination-station/CreateDAOForm"), { ssr: false });

const mockDAOs = [
  { id: 1, name: "ClimateDAO", description: "Funding climate projects", members: 342, proposals: 8, match: 92 },
  { id: 2, name: "EduDAO", description: "Improving educational access", members: 189, proposals: 5, match: 85 },
  { id: 3, name: "DevDAO", description: "Supporting open source developers", members: 567, proposals: 12, match: 78 },
];

const mockProposals = [
  { id: 1, title: "Joint Climate Hackathon", dao: "ClimateDAO", status: "Active", votes: 78, created: "2d ago" },
  { id: 2, title: "Educational Resource Sharing", dao: "EduDAO", status: "Draft", votes: 0, created: "5h ago" }
];

const Account: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Use the scaffold-eth hook to read the contract
  const { data: daoData } = useScaffoldReadContract({
    contractName: "PollinationStation",
    functionName: "getDAO",
    args: [connectedAddress],
  });

  console.log("activeTab", activeTab);

  // Check if the DAO account exists
  if (!daoData) {
    // If no DAO exists, prompt user to create one
    return <CreateDAOForm />;
  }

  // If DAO exists, display the current interface
  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="px-5">
          <h1 className="text-center mb-8">
            <span className="block text-2xl mb-2">Welcome to your</span>
            <span className="block text-4xl font-bold">Account Dashboard 🌸</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row mt-4">
            <p className="my-2 font-medium">Connected as:</p>
            <Address address={connectedAddress} />
          </div>
        </div>

        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          {/* Navigation Tabs */}
          <NavigationTabs onTabChange={setActiveTab} />

          {/* Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top Matches */}
            <div className="bg-base-100 rounded-3xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Top Matches</h3>
                <button className="btn btn-sm btn-secondary">View All</button>
              </div>
              <div className="space-y-4">
                {mockDAOs.map(dao => (
                  <DAOCard key={dao.id} id={dao.id} name={dao.name} description={dao.description} match={dao.match} />
                ))}
              </div>
            </div>

            {/* Recent Proposals */}
            <div className="bg-base-100 rounded-3xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Recent Proposals</h3>
                <button className="btn btn-sm btn-secondary">View All</button>
              </div>
              <div className="space-y-4">
                {mockProposals.map(proposal => (
                  <ProposalCard key={proposal.id} id={proposal.id} title={proposal.title} dao={proposal.dao} status={proposal.status} votes={proposal.votes} created={proposal.created} />
                ))}
              </div>
            </div>
          </div>

          {/* Needs Section */}
          <div className="bg-base-100 rounded-3xl p-6 shadow-lg mt-8">
            <h3 className="text-xl font-bold mb-6">Your Needs</h3>
            <HandleNeed />
          </div>
          {/* Pollin Section */}
          <div className="bg-base-100 rounded-3xl p-6 shadow-lg mt-8">
            <h3 className="text-xl font-bold mb-6">Your Pollins</h3>
            <HandlePollin />
          </div>
        </div>
      </div>
    </>
  );
};

export default Account;
