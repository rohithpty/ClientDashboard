import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { seedClients } from "../data/seedClients.js";

const ClientsContext = createContext(null);
const STORAGE_KEY = "rag-clients";

const loadClients = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return seedClients;
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : seedClients;
  } catch (error) {
    console.warn("Failed to load clients from storage.", error);
    return seedClients;
  }
};

export const ClientsProvider = ({ children }) => {
  const [clients, setClients] = useState(loadClients);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }, [clients]);

  const addClient = (newClient) => {
    setClients((prev) => [...prev, newClient]);
  };

  const updateClient = (id, changes) => {
    setClients((prev) =>
      prev.map((client) =>
        client.id === id ? { ...client, ...changes } : client,
      ),
    );
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
      addStatusUpdate,
    }),
    [clients],
  );

  return (
    <ClientsContext.Provider value={value}>
      {children}
    </ClientsContext.Provider>
  );
};

export const useClients = () => {
  const context = useContext(ClientsContext);
  if (!context) {
    throw new Error("useClients must be used within ClientsProvider");
  }
  return context;
};
