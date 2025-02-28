"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldContract } from "~~/hooks/scaffold-eth";

const HandlePollin = () => {
  const { address: connectedAddress } = useAccount();
  const [needIds, setNeedIds] = useState([]);
  const [pollinIds, setPollinIds] = useState([]);
  const [pollins, setPollins] = useState([]);
  const [isLoadingPollins, setIsLoadingPollins] = useState(false);

  // Use the scaffold-eth hook to read the contract
  const daoDataResult = useScaffoldReadContract({
    contractName: "PollinationStation",
    functionName: "getDAO",
    args: [connectedAddress],
  });

  console.log(needIds)

  useEffect(() => {
    if (daoDataResult.data) {
      if (daoDataResult.data[3]) {
        setNeedIds(daoDataResult.data[3] as any);
      }
      if (daoDataResult.data[4]) {
        setPollinIds(daoDataResult.data[4] as any);
        console.log("pollins", daoDataResult.data[4]);
      }
    }
  }, [daoDataResult.data]);

  const { data: pollinationStationContract } = useScaffoldContract({
    contractName: "PollinationStation",
  });

  // Memoize the fetch functions using useCallback
  const fetchPollins = useCallback(async () => {
    if (!pollinationStationContract || isLoadingPollins) return;
    setIsLoadingPollins(true);
    try {
      const pollinsData = await Promise.all(
        pollinIds.map(async (pollinId) => {
          const result = await pollinationStationContract.read.getPollin([pollinId]);
          return result;
        })
      );
      setPollins(pollinsData as any);
    } catch (error) {
      console.error("Error fetching pollins:", error);
    } finally {
      setIsLoadingPollins(false);
    }
  }, [pollinIds, pollinationStationContract, isLoadingPollins]);

  // Update useEffects to use memoized functions with proper dependencies
  useEffect(() => {
    if (pollinIds.length > 0 && pollinIds.length !== pollins.length) {
      fetchPollins();
    }
  }, [pollinIds, pollins.length, fetchPollins]);

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">Your Pollins</span>
          <span className="block text-4xl font-bold">Pollination Station 🌸</span>
        </h1>
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Your Pollins</h2>
          {
          
          pollins.length > 0 ? (
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pollins.map((pollinItem, index) => (
                <li key={index} className="mb-4">
                  <div className="bg-base-100 rounded-3xl p-6 shadow-lg transform transition duration-500 hover:scale-105">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <h3 className="text-xl font-bold ml-4">Pollin #{index + 1}</h3>
                    </div>
                    <p className="text-sm opacity-70 mb-2">DAO with Need: {pollinItem[0]}</p>
                    <p className="text-sm opacity-70 mb-2">DAO with Offering: {pollinItem[1]}</p>
                    <p className="text-sm opacity-70 mb-2">Need ID: {(pollinItem[2] as bigint).toString()}</p>
                    <p className="text-sm opacity-70 mb-2">Description: {pollinItem[3]}</p>
                    <p className="text-sm opacity-70 mb-2">Confidence: {(pollinItem[4] as bigint).toString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm opacity-70">No pollins available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HandlePollin;
