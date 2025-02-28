"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";

const HandleNeed = () => {
  const { address: connectedAddress } = useAccount();
  const [description, setDescription] = useState("");
  const [needs, setNeeds] = useState([]);
  const [needIds, setNeedIds] = useState([]);

  // Use the scaffold-eth hook to read the contract
  const daoDataResult = useScaffoldReadContract({
    contractName: "PollinationStation",
    functionName: "getDAO",
    args: [connectedAddress],
  });

  useEffect(() => {
    if (daoDataResult.data && daoDataResult.data[3]) {
      setNeedIds(daoDataResult.data[3] as any);
    }
  }, [daoDataResult.data]);

  const { data: pollinationStationContract } = useScaffoldContract({
    contractName: "PollinationStation",
  });

  useEffect(() => {
    if (needIds.length > 0) {
      const fetchNeeds = async () => {
        const needsData = await Promise.all(
          needIds.map(async (needId) => {
            const result = await pollinationStationContract?.read.getNeed([needId]);
            return result;
          })
        );
        setNeeds(needsData as any);
      };
      fetchNeeds();
    }
  }, [needIds, pollinationStationContract]);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PollinationStation",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await writeContractAsync({
        functionName: "addNeed",
        args: [description],
      });
      setDescription("");
    } catch (e) {
      console.error("Error adding need:", e);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">{needs.length > 0 ? "Your Needs" : "Add a New Need"}</span>
          <span className="block text-4xl font-bold">Pollination Station 🌸</span>
        </h1>
        {needs.length > 0 && (
          <ul>
            {needs.map((need, index) => (
              <li key={index} className="mb-4">
                <div className="bg-base-100 rounded-3xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold">Need ID: {need[0]}</h3>
                  <p className="text-sm opacity-70">Description: {need[1]}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form className="space-y-4 mt-8" onSubmit={handleSubmit}>
          <textarea
            placeholder="Need Description"
            className="textarea textarea-bordered w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
          <button className="btn btn-primary w-full" type="submit">
            Add Need
          </button>
        </form>
      </div>
    </div>
  );
};

export default HandleNeed;
