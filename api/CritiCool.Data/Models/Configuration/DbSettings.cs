namespace CritiCool.Data.Models.Configuration
{
    public class DbSettings
    {
        public string Server { get; set; } = string.Empty;
        public uint Port { get; set; }
        public string Database { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
