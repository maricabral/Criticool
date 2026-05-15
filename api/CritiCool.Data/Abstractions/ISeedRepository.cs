namespace CritiCool.Data.Abstractions
{
    public interface ISeedRepository
    {
        /// <summary>
        /// Complete erases CritiCool database
        /// </summary>
        Task NukeCritiCool();
    }
}
