"use client";

import { useState, useEffect } from "react";
import { ContractFunctionExecutionError } from "viem";
import { useAccount } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract, useScaffoldContract } from "~~/hooks/scaffold-eth";

const HandlePollin = () => {
  const { address: connectedAddress } = useAccount();
  const [needs, setNeeds] = useState([]);
  const [needIds, setNeedIds] = useState([]);
  const [selectedNeedId, setSelectedNeedId] = useState(0);
  const [daoWithOffering, setDaoWithOffering] = useState("");
  const [descriptionOfRelationship, setDescriptionOfRelationship] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
    if (needIds.length > 0 && needIds.length !== needs.length && !isLoading && pollinationStationContract) {
      const fetchNeeds = async () => {
        setIsLoading(true);
        try {
          const needsData = await Promise.all(
            needIds.map(async (needId) => {
              const result = await pollinationStationContract.read.getNeed([needId]);
              return result;
            })
          );
          console.log("needsData", needsData);
          setNeeds(needsData as any);
        } catch (error) {
          console.error("Error fetching needs:", error);
        } finally {
          setIsLoading(false);
        }
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
        // setSelectedNeedId(0);
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
                try{
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
              <option key={index} value={index+1}>
                {`Need ID: ${index+1} - ${need?.[0]}`}
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
      </div>
    </div>
  );
};

export default HandlePollin;
