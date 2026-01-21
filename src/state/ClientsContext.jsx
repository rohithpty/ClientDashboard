import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { localClientsRepository } from "../data/clientsRepository.js";

const ClientsContext = createContext(null);

export const ClientsProvider = ({ children }) => {
  const [clients, setClients] = useState(() => localClientsRepository.getClients());

  useEffect(() => {
    localClientsRepository.saveClients(clients);
  }, [clients]);

  const addClient = (newClient) => {
    setClients((prev) => [...prev, newClient]);
  };

  const updateClient = (id, changes) => {
    setClients((prev) =>
      prev.map((client) => (client.id === id ? { ...client, ...changes } : client)),
    );
  };

  const removeClient = (id) => {
    setClients((prev) => prev.filter((client) => client.id !== id));
  };

  const addStatusUpdate = (id, update) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== id) {
          return client;
        }
        const history = [...client.history, update];
        return {
          ...client,
          currentStatus: update.status,
          summary: update.note,
          history,
        };
      }),
    );
  };

  const value = useMemo(
    () => ({
      clients,
      addClient,
      updateClient,
      removeClient,
      addStatusUpdate,
    }),
    [clients],
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
};

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClients must be used within ClientsProvider");
  }
  return context;
};
