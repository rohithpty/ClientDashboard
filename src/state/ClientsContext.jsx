import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  seedAccountManagers,
  seedClients,
  seedTechnicalAccountManagers,
} from "../data/seedClients.js";

const ClientsContext = createContext(null);
const STORAGE_KEY = "rag-clients";

const loadState = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return {
      clients: seedClients,
      accountManagers: seedAccountManagers,
      technicalAccountManagers: seedTechnicalAccountManagers,
    };
  }
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.clients)) {
      return {
        clients: parsed.clients,
        accountManagers: parsed.accountManagers || seedAccountManagers,
        technicalAccountManagers:
          parsed.technicalAccountManagers || seedTechnicalAccountManagers,
      };
    }
    if (Array.isArray(parsed)) {
      return {
        clients: parsed,
        accountManagers: seedAccountManagers,
        technicalAccountManagers: seedTechnicalAccountManagers,
      };
    }
    return {
      clients: seedClients,
      accountManagers: seedAccountManagers,
      technicalAccountManagers: seedTechnicalAccountManagers,
    };
  } catch (error) {
    console.warn("Failed to load clients from storage.", error);
    return {
      clients: seedClients,
      accountManagers: seedAccountManagers,
      technicalAccountManagers: seedTechnicalAccountManagers,
    };
  }
};

export const ClientsProvider = ({ children }) => {
  const initialState = loadState();
  const [clients, setClients] = useState(initialState.clients);
  const [accountManagers, setAccountManagers] = useState(
    initialState.accountManagers,
  );
  const [technicalAccountManagers, setTechnicalAccountManagers] = useState(
    initialState.technicalAccountManagers,
  );

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        clients,
        accountManagers,
        technicalAccountManagers,
      }),
    );
  }, [clients, accountManagers, technicalAccountManagers]);

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
      accountManagers,
      technicalAccountManagers,
      addClient,
      updateClient,
      addStatusUpdate,
      setAccountManagers,
      setTechnicalAccountManagers,
    }),
    [clients, accountManagers, technicalAccountManagers],
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
