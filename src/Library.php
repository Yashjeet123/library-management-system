<?php

declare(strict_types=1);

namespace App;

use App\Models\LibraryItem;
use App\Models\User;
use App\Models\Transaction;
use App\Exceptions\ItemNotAvailableException;
use App\Exceptions\BorrowLimitExceededException;


class Library
{
    private static ?Library $instance = null;

    /** @var LibraryItem[] */
    private array $items = [];

    /** @var User[] */
    private array $users = [];

    /** @var Transaction[] */
    private array $transactions = [];

    private function __construct() {}

    public static function getInstance(): Library
    {
        if (self::$instance === null) {
            self::$instance = new Library();
        }
        return self::$instance;
    }

    public function setItems(array $items): void
    {
        $this->items = $items;
    }
    public function setUsers(array $users): void
    {
        $this->users = $users;
    }
    public function setTransactions(array $tx): void
    {
        $this->transactions = $tx;
    }

    public function addItem(LibraryItem $item): void
    {
        $this->items[] = $item;
    }
    public function addUser(User $user): void
    {
        $this->users[] = $user;
    }

    public function findItemById(int $id): ?LibraryItem
    {
        foreach ($this->items as $i) {
            if ($i->id === $id) return $i;
        }
        return null;
    }

    public function findUserById(int $id): ?User
    {
        foreach ($this->users as $u) {
            if ($u->id === $id) return $u;
        }
        return null;
    }

    public function borrowItem(int $itemId, int $userId, \DateTime $dueDate): bool
    {
        $item = $this->findItemById($itemId);
        $user = $this->findUserById($userId);

        if (!$item) throw new \Exception("Item not found");
        if (!$user) throw new \Exception("User not found");
        if (!$item->isAvailable) throw new ItemNotAvailableException("Item not available");
        $max = $user->getMaxBorrowLimit();
        if (count($user->borrowedItems) >= $max) throw new BorrowLimitExceededException("Borrow limit exceeded");

        $item->markAsUnavailable();
        $user->borrowedItems[] = $item->id;

        $tx = new Transaction();
        $tx->transactionId = (count($this->transactions) + 1);
        $tx->userId = $userId;
        $tx->itemId = $itemId;
        $tx->action = 'borrow';
        $tx->timestamp = new \DateTime();
        $tx->dueDate = $dueDate;
        $this->transactions[] = $tx;

        return true;
    }

    public function returnItem(int $itemId): bool
    {
        $item = $this->findItemById($itemId);
        if (!$item) throw new \Exception("Item not found");
        if ($item->isAvailable) throw new \Exception("Item already available");

        $user = null;
        foreach ($this->users as $u) {
            if (in_array($itemId, $u->borrowedItems, true)) {
                $user = $u;
                break;
            }
        }
        $item->markAsAvailable();
        if ($user) {
            $user->borrowedItems = array_values(array_filter($user->borrowedItems, fn($id) => $id !== $itemId));
        }

        $tx = new Transaction();
        $tx->transactionId = (count($this->transactions) + 1);
        $tx->userId = $user ? $user->id : 0;
        $tx->itemId = $itemId;
        $tx->action = 'return';
        $tx->timestamp = new \DateTime();
        $this->transactions[] = $tx;

        return true;
    }

    public function getAllItems(): array
    {
        return $this->items;
    }
    public function getAllUsers(): array
    {
        return $this->users;
    }
    public function getTransactions(): array
    {
        return $this->transactions;
    }
}
