using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic get entity operations
    /// </summary>
    public interface IGet<T> where T : Entity
    { 
        /// <summary>
        /// Asynchronously retrieves the Entitiy with the specified ID.
        /// </summary>
        /// <typeparam name="T">The Entity to retrieve.</typeparam>
        /// <param name="id">The unique identifier of the task to retrieve.</param>
        /// <returns>The single entity with given Id</returns>
        Task<T> GetAsync(Guid id);
    }
}
