using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Views.Users
{
    public class UserViewModel
    {
        public Guid Id { get; set; }

        [Required]
        [EmailAddress]
        public string? Email { get; set; }

        public string? FirstName { get; set; }
        public string? LastName { get; set; }

        [DataType(DataType.DateTime)]
        public DateTime DateCreated { get; set; }

        [DataType(DataType.DateTime)]
        public DateTime DateUpdated { get; set; }
    }
}
