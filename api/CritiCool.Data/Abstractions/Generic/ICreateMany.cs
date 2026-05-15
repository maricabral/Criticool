using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic create entity operations
    /// </summary>
    public interface ICreateMany<T> where T : Entity
    {
        /// <summary>
        /// Asynchronously creates a list of Entities
        /// </summary>
        /// <typeparam name="T">The type Entity to be created.</typeparam>
        /// <param name="entity">The entity list to be created.</param>
        Task<IEnumerable<Guid>> CreateAsync(List<T> entity);
    }
}
