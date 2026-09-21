FROM mcr.microsoft.com/dotnet/sdk:8.0
WORKDIR /src

COPY Movau.sln ./
COPY src ./src
COPY tests ./tests

ARG PROJECT=src/Movau.Api/Movau.Api.csproj
ENV PROJECT=${PROJECT}

RUN dotnet restore Movau.sln \
    && apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://0.0.0.0:8000 \
    DOTNET_USE_POLLING_FILE_WATCHER=1

EXPOSE 8000 8001 8002

CMD ["sh", "-c", "dotnet watch --project \"$PROJECT\" run --no-launch-profile --urls \"$ASPNETCORE_URLS\""]
