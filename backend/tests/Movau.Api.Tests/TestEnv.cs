using System.Runtime.CompilerServices;

namespace Movau.Api.Tests;

internal static class TestEnv
{
    [ModuleInitializer]
    internal static void Init()
    {
        /* core в compose живёт с EMBED_REALTIME=false; тесты поднимают хаб in-process */
        Environment.SetEnvironmentVariable("EMBED_REALTIME", "true");
    }
}
