import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { localClientsRepository } from "../data/clientsRepository.js";
import { toRichTextHtml } from "../utils/richText.js";

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

  const replaceClients = (nextClients) => {
    setClients(nextClients);
  };

  const addStatusUpdate = (id, update) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== id) {
          return client;
        }
        const normalizedNote = toRichTextHtml(update.note);
        const history = [...client.history, { ...update, note: normalizedNote }];
        return {
          ...client,
          currentStatus: update.status,
          summary: normalizedNote,
          history,
        };
      }),
    );
  };

  const updateStatusUpdate = (id, index, update) => {
    setClients((prev) =>
      prev.map((client) => {
        if (client.id !== id) {
          return client;
        }
        const history = client.history.map((entry, entryIndex) => {
          if (entryIndex !== index) {
            return entry;
          }
          const normalizedNote = toRichTextHtml(update.note);
          return { ...entry, ...update, note: normalizedNote };
        });
        const latest = history[history.length - 1] ?? client;
        return {
          ...client,
          currentStatus: latest.status ?? client.currentStatus,
          summary: latest.note ?? client.summary,
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
      replaceClients,
      addStatusUpdate,
      updateStatusUpdate,
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
