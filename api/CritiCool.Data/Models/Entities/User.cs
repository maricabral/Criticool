using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Entities
{
    public class User : Entity
    {         
        [EmailAddress]
        public string Email { get; set;} = string.Empty;
        
        public string? ProviderId { get; set; }
        public string? ProviderName { get; set; }

        public User() { }

        public User(string email) 
        {
            Email = email;
        }
    }
}
