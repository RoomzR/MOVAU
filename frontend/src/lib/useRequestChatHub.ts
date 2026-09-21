import { HubConnectionBuilder, HubConnectionState } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { ChatMessage, HelpRequest, RequestLocation } from "../types";
import { applyRequestUpdate } from "./useUserHub";

function appendMessage(prev: ChatMessage[] | undefined, dto: ChatMessage) {
  if (!prev) {
    return [dto];
  }
  if (prev.some((row) => row.id === dto.id)) {
    return prev;
  }
  return [...prev, dto];
}

/* SignalR: пока сокет жив — пуш; иначе опрос раз в 4 с */
export function useRequestChatHub(requestId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  const [hubState, setHubState] = useState(HubConnectionState.Disconnected);

  useEffect(() => {
    if (!requestId || !enabled) {
      setHubState(HubConnectionState.Disconnected);
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/chat`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .build();

    const syncState = () => setHubState(connection.state);

    connection.on("message", (dto: ChatMessage) => {
      queryClient.setQueryData<ChatMessage[]>(["messages", requestId], (prev) => appendMessage(prev, dto));
    });
    connection.on("request_updated", (dto: HelpRequest) => {
      applyRequestUpdate(queryClient, dto);
    });
    connection.on("location", (dto: RequestLocation) => {
      queryClient.setQueryData(["request-location", dto.help_request_id], dto);
      if (dto.eta_at) {
        queryClient.setQueryData<HelpRequest>(["request", dto.help_request_id], (prev) =>
          prev ? { ...prev, eta_at: dto.eta_at } : prev,
        );
      }
    });
    connection.onreconnecting(syncState);
    connection.onreconnected(async () => {
      await connection.invoke("Join", requestId);
      syncState();
    });
    connection.onclose(syncState);

    void connection
      .start()
      .then(async () => {
        await connection.invoke("Join", requestId);
        syncState();
      })
      .catch(syncState);

    return () => {
      connection.off("message");
      connection.off("request_updated");
      connection.off("location");
      void connection.stop();
    };
  }, [enabled, queryClient, requestId]);

  return hubState;
}
