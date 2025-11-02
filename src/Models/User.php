<?php

declare(strict_types=1);

namespace App\Models;

class User
{
    public int $id;
    public string $name;
    public string $email;
    public string $membershipType;
    public array $borrowedItems = [];

    public function __construct(int $id, string $name, string $email, string $membershipType = 'Basic', array $borrowedItems = [])
    {
        $this->id = $id;
        $this->name = $name;
        $this->email = $email;
        $this->membershipType = $membershipType;
        $this->borrowedItems = $borrowedItems;
    }

    public function canBorrow(): bool
    {
        return count($this->borrowedItems) < $this->getMaxBorrowLimit();
    }

    public function getBorrowedItems(): array
    {
        return $this->borrowedItems;
    }

    public function addBorrowedItem(int $id): void
    {
        if (!in_array($id, $this->borrowedItems, true)) $this->borrowedItems[] = $id;
    }

    public function removeBorrowedItem(int $id): void
    {
        $this->borrowedItems = array_values(array_filter($this->borrowedItems, fn($i) => $i !== $id));
    }

    public function getMaxBorrowLimit(): int
    {
        return $this->membershipType === 'Premium' ? 10 : 3;
    }
}
