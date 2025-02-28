"use client";

import { useState, useEffect, useCallback } from "react";
import { ContractFunctionExecutionError } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";

const HandlePollin = () => {
  const { address: connectedAddress } = useAccount();
  const [needs, setNeeds] = useState([]);
  const [needIds, setNeedIds] = useState([]);
  const [pollinIds, setPollinIds] = useState([]);
  const [pollins, setPollins] = useState([]);
  const [selectedNeedId, setSelectedNeedId] = useState(1);
  const [daoWithOffering, setDaoWithOffering] = useState("");
  const [descriptionOfRelationship, setDescriptionOfRelationship] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isLoadingNeeds, setIsLoadingNeeds] = useState(false);
  const [isLoadingPollins, setIsLoadingPollins] = useState(false);

  // Use the scaffold-eth hook to read the contract
  const daoDataResult = useScaffoldReadContract({
    contractName: "PollinationStation",
    functionName: "getDAO",
    args: [connectedAddress],
  });


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
  const fetchNeeds = useCallback(async () => {
    if (!pollinationStationContract || isLoadingNeeds) return;
    setIsLoadingNeeds(true);
    try {
      const needsData = await Promise.all(
        needIds.map(async (needId) => {
          const result = await pollinationStationContract.read.getNeed([needId]);
          return result;
        })
      );
      setNeeds(needsData as any);
    } catch (error) {
      console.error("Error fetching needs:", error);
    } finally {
      setIsLoadingNeeds(false);
    }
  }, [needIds, pollinationStationContract, isLoadingNeeds]);

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
    if (needIds.length > 0 && needIds.length !== needs.length) {
      fetchNeeds();
    }
  }, [needIds, needs.length, fetchNeeds]);

  useEffect(() => {
    if (pollinIds.length > 0 && pollinIds.length !== pollins.length) {
      fetchPollins();
    }
  }, [pollinIds, pollins.length, fetchPollins]);

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PollinationStation",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await writeContractAsync({
        functionName: "addPollin",
        args: [
          connectedAddress,
          daoWithOffering,
          BigInt(selectedNeedId),
          descriptionOfRelationship,
          BigInt(Math.round(confidence * 100)),
        ],
      });
      setDaoWithOffering("");
      setDescriptionOfRelationship("");
      setConfidence(0);
    } catch (e: any) {
      if (e instanceof ContractFunctionExecutionError) {
        console.error("Error adding pollin:", e);
        console.log("selectedNeedId", selectedNeedId);
      } else {
        console.error("Error adding pollin:", e);
      }
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">Add a New Pollin</span>
          <span className="block text-4xl font-bold">Pollination Station 🌸</span>
        </h1>
        <form className="space-y-4 mt-8" onSubmit={handleSubmit}>
          <select
            className="select select-bordered w-full"
            value={selectedNeedId}
            onChange={(e) => {
              try {
                console.log("e.target.value", e.target.value);
                const needId = parseFloat(e.target.value);
                console.log("needId", needId);
                setSelectedNeedId(needId);
              } catch (e) {
                if (e instanceof ContractFunctionExecutionError) {
                  console.error("Error adding pollin:", e.message);
                } else {
                  console.error("Error adding pollin:", e);
                }
              }
            }}
          >
            <option value="" disabled>Select Need</option>
            {needs.map((need, index) => (
              <option key={index} value={index + 1}>
                {`Need ID: ${index + 1} - ${need?.[0]}`}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="DAO with Offering Address"
            className="input input-bordered w-full"
            value={daoWithOffering}
            onChange={(e) => setDaoWithOffering(e.target.value)}
          />
          <textarea
            placeholder="Description of Relationship"
            className="textarea textarea-bordered w-full"
            value={descriptionOfRelationship}
            onChange={(e) => setDescriptionOfRelationship(e.target.value)}
          ></textarea>
          <input
            type="number"
            placeholder="Confidence (0 to 1)"
            className="input input-bordered w-full"
            value={confidence}
            onChange={(e) => setConfidence(parseFloat(e.target.value))}
            step="0.01"
            min="0"
            max="1"
          />
          <button className="btn btn-primary w-full" type="submit">
            Add Pollin
          </button>
        </form>
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
