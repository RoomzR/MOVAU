import { HubConnectionBuilder } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { API_URL } from "../api/client";
import { useAuthStore } from "../store/authStore";
import type { HelpRequest, RequestLocation } from "../types";

function applyRequestUpdate(
  queryClient: ReturnType<typeof useQueryClient>,
  dto: HelpRequest,
) {
  queryClient.setQueryData<HelpRequest>(["request", dto.id], dto);
  queryClient.invalidateQueries({ queryKey: ["requests"] });
  queryClient.invalidateQueries({ queryKey: ["requests", "mine"] });
  queryClient.invalidateQueries({ queryKey: ["messages", dto.id] });
}

/* глобальный сокет: назначение и статусы без открытия чата */
export function useUserHub() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/chat`, {
        accessTokenFactory: () => useAuthStore.getState().accessToken ?? "",
      })
      .withAutomaticReconnect()
      .build();

    connection.on("request_updated", (dto: HelpRequest) => {
      applyRequestUpdate(queryClient, dto);
    });
    connection.on("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
    connection.on("location", (dto: RequestLocation) => {
      queryClient.setQueryData(["request-location", dto.help_request_id], dto);
      if (dto.eta_at) {
        queryClient.setQueryData<HelpRequest>(["request", dto.help_request_id], (prev) =>
          prev ? { ...prev, eta_at: dto.eta_at } : prev,
        );
      }
    });

    void connection.start().catch(() => {
      /* опрос страниц остаётся запасным путём */
    });

    return () => {
      connection.off("request_updated");
      connection.off("notification");
      connection.off("location");
      void connection.stop();
    };
  }, [accessToken, queryClient]);
}

export { applyRequestUpdate };
