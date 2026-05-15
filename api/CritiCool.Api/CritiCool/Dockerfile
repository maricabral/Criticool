#See https://aka.ms/containerfastmode to understand how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["/CritiCool.Api/CritiCool/CritiCool.csproj", "CritiCool/"]
COPY ["/CritiCool.Data/CritiCool.Data.csproj", "CritiCool.Data/"]
RUN dotnet restore "CritiCool/CritiCool.csproj"
COPY . .
WORKDIR "/src/CritiCool.Api/CritiCool"
RUN dotnet build "CritiCool.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CritiCool.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CritiCool.dll"]