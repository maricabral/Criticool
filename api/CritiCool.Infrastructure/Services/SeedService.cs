using CritiCool.Data.Abstractions;
using CritiCool.Infrastructure.Abstractions;
using Microsoft.Extensions.Logging;

namespace CritiCool.Infrastructure.Services
{
    public class SeedService(ISeedRepository seedRepository, ILogger<SeedService> logger) : ISeedService
    {
        private readonly ILogger<SeedService> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        private readonly ISeedRepository _seedRepository = seedRepository ?? throw new ArgumentNullException(nameof(seedRepository));

        public async Task NukeDatabase()
        {
            try
            {
                await _seedRepository.NukeCritiCool();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Something went wrong while truncating the database");
                throw;
            }
        }       
    }
}
