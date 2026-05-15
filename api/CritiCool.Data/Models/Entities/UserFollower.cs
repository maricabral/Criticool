namespace CritiCool.Data.Models.Entities
{
    public class UserFollower : Entity
    {
        public Guid UserId { get; set; }
        public Guid FollowerId { get; set; }
    }
}
