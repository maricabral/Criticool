using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic get many entity operations
    /// </summary>
    public interface IGetMany<T> where T : IEnumerable<Entity>
    {
        /// <summary>
        /// Asynchronously retrieves a list Entitiy with the specified identifier
        /// </summary>
        /// <typeparam name="T">The Entity to retrieve.</typeparam>
        /// <param name="id">The unique identifier of the task to retrieve.</param>
        /// <returns>The a enumerable entities based on specified identifier</returns>
        Task<T> GetManyAsync(Guid id);
    }
}
