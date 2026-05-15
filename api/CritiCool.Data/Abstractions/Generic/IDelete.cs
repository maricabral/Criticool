using CritiCool.Data.Models.Entities;
 

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic delete entity operations
    /// </summary>
    public interface IDelete<T> where T : Entity
    {
        /// <summary>
        /// Asynchronously deletes the Entitiy with the specified ID.
        /// </summary>
        /// <param name="id">The unique identifier of the entity to be deleted.</param>
        Task DeleteAsync(Guid id);
    }
}
