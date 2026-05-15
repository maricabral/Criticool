using CritiCool.Infrastructure.Abstractions;
using Microsoft.AspNetCore.Mvc;

namespace CritiCool.Controllers
{
    [Route("[controller]")]
    [ApiController]
    public class SeedController(ISeedService seedService) : ControllerBase
    {
        ISeedService _seedService = seedService;

        [HttpDelete]
        public async Task<IActionResult> Nuke()
        {
            await _seedService.NukeDatabase();
            return Ok();
        }
    }
}
