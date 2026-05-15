using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic create entity operations
    /// </summary>
    public interface ICreate<T> where T : Entity
    {
        /// <summary>
        /// Asynchronously creates an Entitiy
        /// </summary>
        /// <typeparam name="T">The type Entity to be created.</typeparam>
        /// <param name="entity">The entity to be created.</param>
        Task<Guid> CreateAsync(T entity);
    }
}
