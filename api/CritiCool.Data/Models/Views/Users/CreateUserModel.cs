using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.Users
{
    public class CreateUserModel
    {
        [Required]
        [EmailAddress]
        public string? Email { get; set; }
    }
}
