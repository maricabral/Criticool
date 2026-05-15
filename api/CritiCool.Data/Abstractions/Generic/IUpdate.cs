using CritiCool.Data.Models.Entities;

namespace CritiCool.Data.Abstractions.Generic
{
    /// <summary>
    /// Represents generic update entity operations
    /// </summary>
    public interface IUpdate<T> where T : Entity
    {
        /// <summary>
        /// Asynchronously updates the Entitiy with the specified ID.
        /// </summary>
        /// <typeparam name="T">The Entity to retrieve.</typeparam>
        /// <param name="entity">The entity to be updated.</param>
        Task UpdateAsync(T entity);
    }
}
