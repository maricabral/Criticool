using System.ComponentModel.DataAnnotations;

namespace CritiCool.Data.Models.Entities
{
    public abstract class Entity
    {
        [Required]
        public Guid Id { get; set; } = new Guid();
        
        [Required]
        [DataType(DataType.DateTime)]
        public DateTime DateCreated { get; set; } = DateTime.Now;
        
        [Required]
        [DataType(DataType.DateTime)]
        public DateTime DateUpdated { get; set; } = DateTime.Now;
    }
}
