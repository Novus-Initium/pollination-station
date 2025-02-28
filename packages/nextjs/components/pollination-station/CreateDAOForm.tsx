"use client";

import { useState } from "react";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const CreateDAOForm = () => {
//   const { address: connectedAddress } = useAccount();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [socials, setSocials] = useState("");

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "PollinationStation",
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await writeContractAsync({
        functionName: "addDAO",
        args: [title, description, socials],
      });
      setTitle("");
      setDescription("");
      setSocials("");
    } catch (e) {
      console.error("Error creating DAO:", e);
    }
  };

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5">
        <h1 className="text-center mb-8">
          <span className="block text-2xl mb-2">Create Your DAO</span>
          <span className="block text-4xl font-bold">Pollination Station 🌸</span>
        </h1>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="DAO Title" 
            className="input input-bordered w-full" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea 
            placeholder="DAO Description" 
            className="textarea textarea-bordered w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
          <input 
            type="text" 
            placeholder="Socials" 
            className="input input-bordered w-full"
            value={socials}
            onChange={(e) => setSocials(e.target.value)}
          />
          <button className="btn btn-primary w-full" type="submit">
            Create DAO
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateDAOForm;
